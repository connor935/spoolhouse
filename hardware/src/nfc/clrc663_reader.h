#pragma once

#include "nfc_reader.h"

// CLRC663 (NXP) NFC frontend, driven through the iwanders/MFRC630 C library —
// the MFRC630/CLRC663 family shares one register map. The library calls global
// HAL hooks (mfrc630_SPI_*), so only ONE instance of this class may exist;
// fine here, the firmware has a single reader.
//
// SPI is bit-banged on the given pins, like the PN532 before it: both ESP32
// hardware SPI peripherals are taken on the CYD (TFT on HSPI, touch remapped
// onto VSPI).
//
// Unlike the PN532 (a full protocol handler), the CLRC663 is a bare frontend:
// the ISO 14443A state machine runs here. Every poll/operation wakes the tag
// with WUPA, selects it, works on it, then HLTAs it back to sleep so the next
// WUPA finds it again — that keeps presence polling and multi-step reads
// consistent without tracking tag state across calls.
class Clrc663Reader : public NfcReader {
public:
  Clrc663Reader(uint8_t sckPin, uint8_t misoPin, uint8_t mosiPin, uint8_t csPin);

  bool begin() override;
  bool readUid(NfcUid &uid, uint16_t timeoutMs) override;
  const char *chipName() const override { return "CLRC663"; }

  bool mifareReadBlock(const NfcUid &uid, uint8_t block, MifareKeyType keyType, const uint8_t key[6],
                       uint8_t out[16]) override;
  bool supportsMifareClassic() const override { return true; }

  bool readNtagPages(const NfcUid &uid, uint8_t startPage, uint8_t count, uint8_t *out) override;
  bool supportsNtag() const override { return true; }
  bool writeNtagPages(const NfcUid &uid, uint8_t startPage, uint8_t count,
                      const uint8_t *data) override;

private:
  // WUPA + anticollision/select; true only if the selected tag matches
  // `expected`. Leaves the tag ACTIVE (ready for read/write/auth).
  bool selectTag(const NfcUid &expected);
};
