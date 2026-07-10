#include "bambu_decoder.h"

#include "bambu_keys.h"

namespace {

uint16_t readU16LE(const uint8_t *p) { return (uint16_t)p[0] | ((uint16_t)p[1] << 8); }

float readFloatLE(const uint8_t *p) {
  float f;
  memcpy(&f, p, sizeof(f));  // ESP32 is little-endian, matching the tag
  return f;
}

// Copy a fixed-width, possibly non-terminated ASCII field, trimming trailing
// NULs/spaces. Non-printable bytes abort (returns empty) so garbage from a
// wrong-format tag doesn't reach the screen.
void copyAscii(const uint8_t *src, uint8_t srcLen, char *dst, size_t dstCap) {
  size_t n = 0;
  for (uint8_t i = 0; i < srcLen && n + 1 < dstCap; i++) {
    const uint8_t c = src[i];
    if (c == 0x00) break;
    if (c < 0x20 || c > 0x7e) {
      dst[0] = '\0';
      return;
    }
    dst[n++] = (char)c;
  }
  while (n > 0 && dst[n - 1] == ' ') n--;  // trim trailing spaces
  dst[n] = '\0';
}

}  // namespace

bool BambuDecoder::decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) {
  if (!reader.supportsMifareClassic()) return false;

  uint8_t keys[16][6];
  if (!deriveBambuKeys(uid.bytes, uid.length, keys)) return false;

  auto readOnce = [&](uint8_t block, uint8_t buf[16]) -> bool {
    for (uint8_t attempt = 0; attempt < 2; attempt++) {
      if (reader.mifareReadBlock(uid, block, MIFARE_KEY_A, keys[block / 4], buf)) return true;
      delay(15);
    }
    return false;
  };

  // Read every data block, re-reading only the ones that failed, in rounds,
  // until we have them all (or a bounded number of rounds). MIFARE auth over
  // the bit-banged SPI fails intermittently, and we want a complete decode.
  static const uint8_t kBlocks[] = {2, 1, 4, 5, 6, 9, 10, 12, 14};
  uint8_t data[16][16];
  bool got[16] = {false};
  constexpr uint8_t kRounds = 8;

  for (uint8_t round = 0; round < kRounds; round++) {
    bool missing = false;
    for (uint8_t i = 0; i < sizeof(kBlocks); i++) {
      const uint8_t b = kBlocks[i];
      if (got[b]) continue;
      if (readOnce(b, data[b])) {
        got[b] = true;
      } else {
        missing = true;
      }
    }
    // Detection: block 2 must authenticate with the derived key. If it never
    // does, this isn't a Bambu tag — bail without spending more rounds.
    if (round == 0 && !got[2]) return false;
    if (!missing) break;
  }
  if (!got[2]) return false;

  out = FilamentInfo{};
  out.valid = true;
  strncpy(out.manufacturer, manufacturer(), sizeof(out.manufacturer) - 1);

  if (got[1]) {  // variant/SKU (0-8) + internal material id (8-16)
    copyAscii(data[1], 8, out.sku, sizeof(out.sku));
    copyAscii(data[1] + 8, 8, out.materialId, sizeof(out.materialId));
  }

  // Material: prefer the detailed name in block 4, fall back to block 2's type
  if (got[4]) copyAscii(data[4], 16, out.material, sizeof(out.material));
  if (out.material[0] == '\0') copyAscii(data[2], 16, out.material, sizeof(out.material));

  if (got[5]) {  // color RGBA, nominal weight, diameter
    memcpy(out.colorRgba, data[5], 4);
    out.hasColor = true;
    snprintf(out.color, sizeof(out.color), "#%02X%02X%02X", data[5][0], data[5][1], data[5][2]);
    out.nominalWeightGrams = readU16LE(data[5] + 4);
    out.diameterMm = readFloatLE(data[5] + 8);
  }

  if (got[6]) {  // temperatures (max hotend @8, min hotend @10)
    out.maxHotendC = readU16LE(data[6] + 8);
    out.minHotendC = readU16LE(data[6] + 10);
  }

  // Block 9: Tray UID — unique per-spool id (16 binary bytes), hex-encoded
  if (got[9]) {
    for (uint8_t i = 0; i < 16; i++) snprintf(out.spoolId + i * 2, 3, "%02X", data[9][i]);
  }

  if (got[10]) out.spoolWidthMm = readU16LE(data[10] + 4) / 100.0f;    // width mm x100 @4
  if (got[12]) copyAscii(data[12], 16, out.productionDate, sizeof(out.productionDate));
  if (got[14]) out.lengthMeters = readU16LE(data[14] + 4);             // length m @4

  return true;
}
