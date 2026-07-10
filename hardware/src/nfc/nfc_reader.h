#pragma once

#include <Arduino.h>

// A detected tag UID. ISO 14443A UIDs are 4, 7 or 10 bytes long.
struct NfcUid {
  uint8_t bytes[10] = {0};
  uint8_t length = 0;

  bool operator==(const NfcUid &other) const {
    return length == other.length && memcmp(bytes, other.bytes, length) == 0;
  }
  bool operator!=(const NfcUid &other) const { return !(*this == other); }

  // e.g. "04:A3:2F:19:B2:5C:80"
  String toHexString() const {
    String s;
    s.reserve(length * 3);
    for (uint8_t i = 0; i < length; i++) {
      if (i) s += ':';
      if (bytes[i] < 0x10) s += '0';
      s += String(bytes[i], HEX);
    }
    s.toUpperCase();
    return s;
  }
};

// MIFARE Classic key slots (matches the PN532 driver's key numbering).
enum MifareKeyType : uint8_t { MIFARE_KEY_A = 0, MIFARE_KEY_B = 1 };

// Abstraction over NFC reader chips so the firmware doesn't care which one is
// wired up (PN532 today, CLRC663 when it arrives). Implementations own their
// bus/driver specifics; main.cpp and the spool decoders only talk to this
// interface.
class NfcReader {
public:
  virtual ~NfcReader() = default;

  // Initialize the chip; false if it doesn't respond (firmware keeps running,
  // the scale works without NFC).
  virtual bool begin() = 0;

  // Poll for an ISO 14443A tag for at most timeoutMs. Returns true and fills
  // uid when a tag is in the field.
  virtual bool readUid(NfcUid &uid, uint16_t timeoutMs) = 0;

  // Human-readable chip name for the boot log / display
  virtual const char *chipName() const = 0;

  // ---- MIFARE Classic support (encrypted vendor tags, e.g. Bambu Lab) ----
  // Re-select the tag, authenticate the given block's sector with a 6-byte
  // key, and read the 16-byte block into out. Returns false on any failure or
  // if the reader can't do MIFARE Classic. Re-selecting per call keeps the
  // session robust across the driver's auth-failure semantics.
  virtual bool mifareReadBlock(const NfcUid & /*uid*/, uint8_t /*block*/, MifareKeyType /*keyType*/,
                               const uint8_t /*key*/[6], uint8_t /*out*/[16]) {
    return false;
  }

  // Whether this reader can service mifareReadBlock at all.
  virtual bool supportsMifareClassic() const { return false; }

  // ---- NTAG / MIFARE Ultralight support (NDEF tags, e.g. OpenTag3D) ----
  // Re-select the tag and read `count` 4-byte pages starting at startPage into
  // out (count*4 bytes). Returns false on failure or if unsupported.
  virtual bool readNtagPages(const NfcUid & /*uid*/, uint8_t /*startPage*/, uint8_t /*count*/,
                             uint8_t * /*out*/) {
    return false;
  }
  virtual bool supportsNtag() const { return false; }
};
