#include "clrc663_reader.h"

#include <Arduino.h>
#include <mfrc630.h>

#include "debuglog.h"

// ---- HAL for the mfrc630 library: bit-banged SPI mode 0, MSB first ----
// (The declarations in mfrc630.h carry C linkage; these definitions inherit it.)

namespace {
uint8_t s_sck, s_miso, s_mosi, s_cs;
}

void mfrc630_SPI_select() { digitalWrite(s_cs, LOW); }
void mfrc630_SPI_unselect() { digitalWrite(s_cs, HIGH); }

void mfrc630_SPI_transfer(const uint8_t *tx, uint8_t *rx, uint16_t len) {
  for (uint16_t i = 0; i < len; i++) {
    const uint8_t out = tx ? tx[i] : 0;
    uint8_t in = 0;
    for (int8_t b = 7; b >= 0; b--) {
      digitalWrite(s_mosi, (out >> b) & 1);
      digitalWrite(s_sck, HIGH);  // chip samples MOSI on the rising edge
      in = (in << 1) | (digitalRead(s_miso) ? 1 : 0);
      digitalWrite(s_sck, LOW);   // chip shifts MISO on the falling edge
    }
    if (rx) rx[i] = in;
  }
}

namespace {

// Poll IRQ1 until timer0 underflows (timeout) or the global IRQ fires (Rx/err/
// idle — whatever was enabled). Same pattern the library uses internally.
// Returns the final IRQ1 value; the timer bit set means the operation timed out.
uint8_t waitIrq1() {
  uint8_t irq1 = 0;
  while (!(irq1 & MFRC630_IRQ1_TIMER0_IRQ)) {
    irq1 = mfrc630_irq1();
    if (irq1 & MFRC630_IRQ1_GLOBAL_IRQ) break;
  }
  return irq1;
}

// Arm timer0 as the operation timeout (211 kHz clock, starts when Tx ends) and
// enable the idle/error → global IRQ path, mirroring the library's transceives.
void armTimeout(uint16_t ticks) {
  mfrc630_write_reg(MFRC630_REG_IRQ0EN, MFRC630_IRQ0EN_IDLE_IRQEN | MFRC630_IRQ0EN_ERR_IRQEN);
  mfrc630_write_reg(MFRC630_REG_IRQ1EN, MFRC630_IRQ1EN_TIMER0_IRQEN);
  mfrc630_timer_set_control(0, MFRC630_TCONTROL_CLK_211KHZ | MFRC630_TCONTROL_START_TX_END);
  mfrc630_timer_set_reload(0, ticks);
  mfrc630_timer_set_value(0, ticks);
  mfrc630_clear_irq0();
  mfrc630_clear_irq1();
}

// HLTA: put the currently selected tag back to HALT so the next WUPA poll
// finds it again. No response is expected — the timeout IS the success path.
void haltTag() {
  mfrc630_flush_fifo();
  mfrc630_write_reg(MFRC630_REG_TXCRCPRESET, MFRC630_RECOM_14443A_CRC | MFRC630_CRC_ON);
  mfrc630_write_reg(MFRC630_REG_RXCRCCON, MFRC630_RECOM_14443A_CRC | MFRC630_CRC_OFF);
  armTimeout(300);  // ~1.5 ms is plenty for the no-answer window
  const uint8_t hlta[2] = {0x50, 0x00};
  mfrc630_cmd_transceive(hlta, 2);
  waitIrq1();
  mfrc630_cmd_idle();
}

// Diagnostic detail of the last failed low-level operation (write path only).
String s_lastErr;

// RF field control (TxEn = DrvMod bit 3). The field is energised only while an
// operation runs: a continuously-on 13.56 MHz field needlessly loads the CYD's
// marginal 5 V rail (visible as display flicker). Each public method is one
// self-contained field session — tags start unpowered (IDLE) and every session
// re-selects from scratch, so no state is lost by cycling the field.
void fieldOn() {
  mfrc630_write_reg(MFRC630_REG_DRVMOD, 0x8A);  // AN11022 value, TxEn set
  delay(5);  // ISO 14443-3 guard time: let tags power up before the first WUPA
}
void fieldOff() { mfrc630_write_reg(MFRC630_REG_DRVMOD, 0x8A & ~0x08); }

struct FieldSession {
  FieldSession() { fieldOn(); }
  ~FieldSession() { fieldOff(); }
};

// Write one 4-byte NTAG/Ultralight page (command 0xA2). The tag answers with a
// 4-bit ACK (0xA). The library only has the MIFARE Classic 16-byte write, so
// this mirrors its transceive recipe with the NTAG framing.
bool ntagWritePage(uint8_t page, const uint8_t *data4) {
  mfrc630_flush_fifo();
  mfrc630_write_reg(MFRC630_REG_TXCRCPRESET, MFRC630_RECOM_14443A_CRC | MFRC630_CRC_ON);
  mfrc630_write_reg(MFRC630_REG_RXCRCCON, MFRC630_RECOM_14443A_CRC | MFRC630_CRC_OFF);
  armTimeout(2000);  // 10 ms — the tag's EEPROM programming takes ~4 ms

  const uint8_t req[6] = {0xA2, page, data4[0], data4[1], data4[2], data4[3]};
  mfrc630_cmd_transceive(req, sizeof(req));
  const uint8_t irq1 = waitIrq1();
  mfrc630_cmd_idle();

  if (irq1 & MFRC630_IRQ1_TIMER0_IRQ) {  // no answer
    s_lastErr = "p" + String(page) + " timeout";
    return false;
  }
  const uint8_t irq0 = mfrc630_irq0();
  const uint8_t errReg = mfrc630_read_reg(MFRC630_REG_ERROR);
  const uint8_t flen = (uint8_t)mfrc630_fifo_length();
  if (flen >= 1) {  // got a whole byte — check the ACK nibble directly
    uint8_t res = 0;
    mfrc630_read_fifo(&res, 1);
    if ((res & 0x0F) == MFRC630_MF_ACK) return true;
    s_lastErr = "p" + String(page) + " nak=" + String(res, HEX);
    return false;
  }
  // The tag's answer is a bare 4-bit ACK/NAK; the CLRC663 receiver flags such
  // short frames as a minimum-frame-length error and discards them (empty
  // FIFO), so the answer's value is unobservable here. An answer did arrive
  // though — count it as tentative success; writeNtagPages verifies the data
  // by reading it back, which catches NAKed/lost writes.
  if ((irq0 & MFRC630_IRQ0_ERR_IRQ) && (errReg & (uint8_t)~MFRC630_ERROR_MINFRAMEERR) == 0) {
    return true;
  }
  s_lastErr = "p" + String(page) + " irq0=" + String(irq0, HEX) + " err=" + String(errReg, HEX);
  return false;
}

}  // namespace

Clrc663Reader::Clrc663Reader(uint8_t sckPin, uint8_t misoPin, uint8_t mosiPin, uint8_t csPin) {
  s_sck = sckPin;
  s_miso = misoPin;
  s_mosi = mosiPin;
  s_cs = csPin;
}

bool Clrc663Reader::begin() {
  pinMode(s_cs, OUTPUT);
  digitalWrite(s_cs, HIGH);
  pinMode(s_sck, OUTPUT);
  digitalWrite(s_sck, LOW);
  pinMode(s_mosi, OUTPUT);
  // Pull-up so a dead/absent chip reads 0xFF (fails the probe below) instead of
  // floating garbage that could pass for a live register.
  pinMode(s_miso, INPUT_PULLUP);

  mfrc630_write_reg(MFRC630_REG_COMMAND, MFRC630_CMD_SOFTRESET);
  delay(50);
  const uint8_t version = mfrc630_read_reg(MFRC630_REG_VERSION);
  if (version == 0x00 || version == 0xFF) return false;  // bus dead / no chip
  Serial.printf("[nfc] CLRC663 version 0x%02X\n", version);

  mfrc630_cmd_idle();
  mfrc630_flush_fifo();
  // The AN11022 recommended table includes the antenna-driver registers
  // (DrvMod 0x8A, TxAmp 0x08, DrvCon 0x21, TxL 0x1A). Overriding them with
  // NXP's CLEV663B eval-board values (0x8E/0x15/0x11/0x06) made NTAG stickers
  // flaky on this breakout (weak coupling: reads intermittent, writes dead),
  // so stick with the plain recommended values.
  mfrc630_AN1102_recommended_registers(MFRC630_PROTO_ISO14443A_106_MILLER_MANCHESTER);
  fieldOff();  // idle with the field down; each operation raises it on demand
  return true;
}

bool Clrc663Reader::readUid(NfcUid &uid, uint16_t timeoutMs) {
  FieldSession rf;
  const uint32_t start = millis();
  do {
    // WUPA (not REQA) so tags we HLTA'd after the previous poll answer too.
    if (mfrc630_iso14443a_WUPA() != 0) {
      uint8_t buf[10] = {0};
      uint8_t sak = 0;
      const uint8_t len = mfrc630_iso14443a_select(buf, &sak);
      if (len == 4 || len == 7 || len == 10) {
        memcpy(uid.bytes, buf, len);
        uid.length = len;
        haltTag();
        return true;
      }
    }
  } while (millis() - start < timeoutMs);
  return false;
}

bool Clrc663Reader::selectTag(const NfcUid &expected) {
  // Two rounds: a tag left ACTIVE by an aborted operation ignores the first
  // WUPA (which knocks it back to IDLE) and answers the second.
  s_lastErr = "sel:";
  for (uint8_t attempt = 0; attempt < 2; attempt++) {
    const uint16_t atqa = mfrc630_iso14443a_WUPA();
    if (atqa != 0) {
      uint8_t buf[10] = {0};
      uint8_t sak = 0;
      const uint8_t len = mfrc630_iso14443a_select(buf, &sak);
      if (len == expected.length && memcmp(buf, expected.bytes, len) == 0) return true;
      if (len != 0) {  // a different tag is in the field
        NfcUid other;
        memcpy(other.bytes, buf, len);
        other.length = len;
        s_lastErr += " other=" + other.toHexString();
        haltTag();
        return false;
      }
      s_lastErr += " atqa=" + String(atqa, HEX) + ",sel0";
    } else {
      s_lastErr += " atqa0";
    }
    delay(5);
  }
  return false;
}

bool Clrc663Reader::mifareReadBlock(const NfcUid &uid, uint8_t block, MifareKeyType keyType,
                                    const uint8_t key[6], uint8_t out[16]) {
  FieldSession rf;
  if (!selectTag(uid)) return false;

  mfrc630_cmd_load_key(key);
  const uint8_t kt = keyType == MIFARE_KEY_A ? MFRC630_MF_AUTH_KEY_A : MFRC630_MF_AUTH_KEY_B;
  bool ok = false;
  if (mfrc630_MF_auth(uid.bytes, kt, block)) {
    ok = mfrc630_MF_read_block(block, out) == 16;
    mfrc630_MF_deauth();  // Crypto1 stays on until cleared by the host
  }
  // Best effort — after a failed auth the tag ignores plain frames and drops
  // back to IDLE by itself; selectTag's retry covers the next access.
  haltTag();
  return ok;
}

bool Clrc663Reader::readNtagPages(const NfcUid &uid, uint8_t startPage, uint8_t count, uint8_t *out) {
  FieldSession rf;
  if (!selectTag(uid)) return false;

  // The ISO READ command (0x30) returns 16 bytes = 4 pages on NTAG/Ultralight,
  // so read in strides of 4 and copy out only what the caller asked for.
  bool ok = true;
  for (uint8_t i = 0; i < count; i += 4) {
    uint8_t buf[16];
    if (mfrc630_MF_read_block(startPage + i, buf) != 16) {
      ok = false;
      break;
    }
    const uint8_t pages = (uint8_t)(count - i) < 4 ? (uint8_t)(count - i) : 4;
    memcpy(out + i * 4, buf, pages * 4);
  }
  haltTag();
  return ok;
}

bool Clrc663Reader::writeNtagPages(const NfcUid &uid, uint8_t startPage, uint8_t count,
                                   const uint8_t *data) {
  FieldSession rf;
  if (!selectTag(uid)) {
    debuglog::add("wr diag: " + s_lastErr);  // temporary write-failure diagnostics
    return false;
  }

  // EEPROM programming is the most power-hungry thing a tag does; marginal
  // (clone) tags brown out and reset at random points in a write burst, and
  // because the chip masks the 4-bit ACK/NAK (see ntagWritePage), a lost write
  // is invisible until read back. So: write in rounds — write the outstanding
  // 4-page chunks, read everything back, and rewrite only the chunks whose
  // data didn't land. The read-back is the sole arbiter of success.
  const uint8_t chunks = (uint8_t)((count + 3) / 4);
  bool dirty[64];  // count is uint8_t, so at most 64 chunks
  for (uint8_t c = 0; c < chunks; c++) dirty[c] = true;

  for (uint8_t round = 0; round < 3; round++) {
    for (uint8_t c = 0; c < chunks; c++) {
      if (!dirty[c]) continue;
      const uint8_t first = c * 4;
      const uint8_t pages = (uint8_t)(count - first) < 4 ? (uint8_t)(count - first) : 4;
      for (uint8_t p = 0; p < pages; p++) {
        // On a failed page, re-select once and retry; if it still fails, move
        // on — the verify pass below decides what actually needs rewriting.
        if (!ntagWritePage(first + p + startPage, data + (first + p) * 4)) {
          if (selectTag(uid)) ntagWritePage(first + p + startPage, data + (first + p) * 4);
        }
        delay(2);  // breather for the tag's supply between EEPROM burns
      }
    }

    delay(5);  // last page's programming time
    bool anyDirty = false;
    for (uint8_t c = 0; c < chunks; c++) {
      if (!dirty[c]) continue;
      const uint8_t first = c * 4;
      const uint8_t pages = (uint8_t)(count - first) < 4 ? (uint8_t)(count - first) : 4;
      uint8_t buf[16];
      if (mfrc630_MF_read_block(startPage + first, buf) == 16 &&
          memcmp(buf, data + first * 4, pages * 4) == 0) {
        dirty[c] = false;
      } else {
        anyDirty = true;
        s_lastErr = "verify mismatch p" + String(startPage + first) + " round " + String(round);
      }
    }
    if (!anyDirty) {
      haltTag();
      return true;
    }
    if (!selectTag(uid)) break;  // tag gone — the diag keeps selectTag's detail
  }

  debuglog::add("wr diag: " + s_lastErr);
  haltTag();
  return false;
}
