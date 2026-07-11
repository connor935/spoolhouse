#pragma once

#include <Adafruit_PN532.h>

#include "nfc_reader.h"

// PN532 in SPI mode, bit-banged over the given pins (software SPI — the
// Adafruit driver is flaky over ESP32 hardware SPI with clone modules).
class Pn532Reader : public NfcReader {
public:
  Pn532Reader(uint8_t sckPin, uint8_t misoPin, uint8_t mosiPin, uint8_t csPin)
      : _pn532(sckPin, misoPin, mosiPin, csPin) {}

  bool begin() override;
  bool readUid(NfcUid &uid, uint16_t timeoutMs) override;
  const char *chipName() const override { return "PN532"; }

  bool mifareReadBlock(const NfcUid &uid, uint8_t block, MifareKeyType keyType, const uint8_t key[6],
                       uint8_t out[16]) override;
  bool supportsMifareClassic() const override { return true; }

  bool readNtagPages(const NfcUid &uid, uint8_t startPage, uint8_t count, uint8_t *out) override;
  bool supportsNtag() const override { return true; }
  bool writeNtagPages(const NfcUid &uid, uint8_t startPage, uint8_t count,
                      const uint8_t *data) override;

private:
  Adafruit_PN532 _pn532;
};
