#include "pn532_reader.h"

bool Pn532Reader::begin() {
  _pn532.begin();
  // Clone modules often come up slower than the ESP32 boots; probe a few times
  for (uint8_t attempt = 0; attempt < 3; attempt++) {
    const uint32_t version = _pn532.getFirmwareVersion();
    if (version != 0) {
      Serial.printf("[nfc] PN532 firmware %lu.%lu\n", (version >> 16) & 0xFF, (version >> 8) & 0xFF);
      // Configure the Secure Access Module for normal tag reading
      return _pn532.SAMConfig();
    }
    delay(50);
  }
  return false;
}

bool Pn532Reader::readUid(NfcUid &uid, uint16_t timeoutMs) {
  uint8_t buffer[10] = {0};
  uint8_t length = 0;
  if (!_pn532.readPassiveTargetID(PN532_MIFARE_ISO14443A, buffer, &length, timeoutMs)) {
    return false;
  }
  if (length == 0 || length > sizeof(uid.bytes)) return false;
  memcpy(uid.bytes, buffer, length);
  uid.length = length;
  return true;
}

bool Pn532Reader::mifareReadBlock(const NfcUid &uid, uint8_t block, MifareKeyType keyType,
                                  const uint8_t key[6], uint8_t out[16]) {
  // Re-select the card so we always start from a clean auth state — a failed
  // MIFARE Classic auth otherwise poisons the session until reselection.
  uint8_t selUid[10] = {0};
  uint8_t selLen = 0;
  if (!_pn532.readPassiveTargetID(PN532_MIFARE_ISO14443A, selUid, &selLen, 50)) return false;
  if (selLen != uid.length || memcmp(selUid, uid.bytes, selLen) != 0) return false;  // different tag

  if (!_pn532.mifareclassic_AuthenticateBlock(selUid, selLen, block, keyType, const_cast<uint8_t *>(key))) {
    return false;
  }
  return _pn532.mifareclassic_ReadDataBlock(block, out);
}

bool Pn532Reader::readNtagPages(const NfcUid &uid, uint8_t startPage, uint8_t count, uint8_t *out) {
  uint8_t selUid[10] = {0};
  uint8_t selLen = 0;
  if (!_pn532.readPassiveTargetID(PN532_MIFARE_ISO14443A, selUid, &selLen, 50)) return false;
  if (selLen != uid.length || memcmp(selUid, uid.bytes, selLen) != 0) return false;

  // NTAG/Ultralight are read one 4-byte page at a time.
  for (uint8_t i = 0; i < count; i++) {
    if (!_pn532.mifareultralight_ReadPage(startPage + i, out + i * 4)) return false;
  }
  return true;
}

bool Pn532Reader::writeNtagPages(const NfcUid &uid, uint8_t startPage, uint8_t count,
                                 const uint8_t *data) {
  uint8_t selUid[10] = {0};
  uint8_t selLen = 0;
  if (!_pn532.readPassiveTargetID(PN532_MIFARE_ISO14443A, selUid, &selLen, 50)) return false;
  if (selLen != uid.length || memcmp(selUid, uid.bytes, selLen) != 0) return false;

  // NTAG/Ultralight are written one 4-byte page at a time. The driver takes a
  // non-const buffer, so copy each page. A blank NTAG21x has its user memory
  // from page 4 up; MIFARE Classic tags reject these commands (write fails).
  for (uint8_t i = 0; i < count; i++) {
    uint8_t page[4];
    memcpy(page, data + i * 4, 4);
    if (!_pn532.mifareultralight_WritePage(startPage + i, page)) return false;
  }
  return true;
}
