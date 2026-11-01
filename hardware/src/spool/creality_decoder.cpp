#include "creality_decoder.h"

#include <ctype.h>

namespace {
// Creality tags authenticate with the factory-default MIFARE key.
const uint8_t kDefaultKey[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

bool isHex(char c) { return isxdigit((unsigned char)c); }
}  // namespace

// Layout (community-documented, partial): blocks 4-6 hold one ASCII record,
//   batch(3) date(5 YYMDD) supplier(4) material(5) #RRGGBB(7) spoolId(6) …
// e.g. "7A324120 0A21 01001 #000000 016500 …". No dependable weight field.
bool CrealityDecoder::decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) {
  if (!reader.supportsMifareClassic()) return false;

  uint8_t blocks[3][16];
  for (uint8_t i = 0; i < 3; i++) {
    if (!reader.mifareReadBlock(uid, 4 + i, MIFARE_KEY_A, kDefaultKey, blocks[i])) return false;
  }

  // Flatten to one ASCII buffer
  char data[49];
  for (uint8_t i = 0; i < 3; i++) memcpy(data + i * 16, blocks[i], 16);
  data[48] = '\0';

  // Detection: batch is 3 hex chars followed by a 5-digit date. A random
  // default-key MIFARE tag won't match this shape.
  if (!(isHex(data[0]) && isHex(data[1]) && isHex(data[2]))) return false;
  for (uint8_t i = 3; i < 8; i++) {
    if (!isdigit((unsigned char)data[i])) return false;
  }

  out = FilamentInfo{};
  out.valid = true;
  strncpy(out.manufacturer, manufacturer(), sizeof(out.manufacturer) - 1);
  // The record has no dependable per-spool id, so the tag's NFC UID is it
  // (stable for the tag's lifetime, unique enough within one user's spools).
  strncpy(out.spoolId, uid.toHexString().c_str(), sizeof(out.spoolId) - 1);

  // Material id: 5 chars at offset 12
  strncpy(out.material, data + 12, 5);
  out.material[5] = '\0';

  // Colour: the "#RRGGBB" run — locate the '#'
  for (uint8_t i = 0; i + 6 < sizeof(data) && data[i]; i++) {
    if (data[i] != '#') continue;
    bool ok = true;
    for (uint8_t j = 1; j <= 6; j++) ok = ok && isHex(data[i + j]);
    if (!ok) break;
    strncpy(out.color, data + i, 7);
    out.color[7] = '\0';
    long rgb = strtol(out.color + 1, nullptr, 16);
    out.colorRgba[0] = (rgb >> 16) & 0xFF;
    out.colorRgba[1] = (rgb >> 8) & 0xFF;
    out.colorRgba[2] = rgb & 0xFF;
    out.colorRgba[3] = 0xFF;
    out.hasColor = true;
    break;
  }
  return true;
}
