#include "opentag_decoder.h"

#include <ctype.h>

namespace {

constexpr uint8_t kStartPage = 4;   // NTAG user memory starts at page 4
constexpr uint8_t kPageCount = 36;  // 144 bytes — covers NTAG213 user memory
constexpr uint16_t kBufLen = kPageCount * 4;

const char kMime[] = "application/opentag3d";

uint16_t readU16BE(const uint8_t *p) { return ((uint16_t)p[0] << 8) | p[1]; }

// Copy a fixed-width UTF-8/ASCII field, stopping at NUL, trimming trailing
// spaces. Returns chars written.
size_t copyText(const uint8_t *src, size_t srcLen, char *dst, size_t dstCap) {
  size_t n = 0;
  for (size_t i = 0; i < srcLen && n + 1 < dstCap; i++) {
    if (src[i] == 0x00) break;
    dst[n++] = (char)src[i];
  }
  while (n > 0 && dst[n - 1] == ' ') n--;
  dst[n] = '\0';
  return n;
}

// Locate the NDEF TLV (0x03) in the NTAG memory image, returning the offset of
// its value (the NDEF message) and its length, or false.
bool findNdefMessage(const uint8_t *buf, uint16_t len, uint16_t &msgOff, uint16_t &msgLen) {
  uint16_t p = 0;
  while (p < len) {
    const uint8_t t = buf[p];
    if (t == 0x03) {  // NDEF Message TLV
      if (p + 1 >= len) return false;
      uint16_t l = buf[p + 1];
      uint16_t hdr = 2;
      if (l == 0xFF) {  // 3-byte length form
        if (p + 3 >= len) return false;
        l = ((uint16_t)buf[p + 2] << 8) | buf[p + 3];
        hdr = 4;
      }
      if (p + hdr + l > len) l = len - (p + hdr);  // clamp to what we read
      msgOff = p + hdr;
      msgLen = l;
      return true;
    }
    if (t == 0x00) {  // NULL TLV, skip one byte
      p++;
      continue;
    }
    if (t == 0xFE) return false;  // Terminator
    if (p + 1 >= len) return false;
    uint16_t l = buf[p + 1];
    p += 2 + l;  // skip other TLVs (e.g. Lock Control 0x01)
  }
  return false;
}

}  // namespace

bool OpenTagDecoder::decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) {
  if (!reader.supportsNtag()) return false;

  uint8_t buf[kBufLen];
  if (!reader.readNtagPages(uid, kStartPage, kPageCount, buf)) return false;

  uint16_t msgOff = 0, msgLen = 0;
  if (!findNdefMessage(buf, kBufLen, msgOff, msgLen)) return false;
  const uint8_t *msg = buf + msgOff;
  if (msgLen < 4) return false;

  // Parse the first NDEF record header
  uint16_t idx = 0;
  const uint8_t flags = msg[idx++];
  const bool shortRecord = flags & 0x10;
  const bool hasId = flags & 0x08;
  const uint8_t typeLen = msg[idx++];

  uint32_t payloadLen;
  if (shortRecord) {
    payloadLen = msg[idx++];
  } else {
    if (idx + 4 > msgLen) return false;
    payloadLen = ((uint32_t)msg[idx] << 24) | ((uint32_t)msg[idx + 1] << 16) |
                 ((uint32_t)msg[idx + 2] << 8) | msg[idx + 3];
    idx += 4;
  }
  const uint8_t idLen = hasId ? msg[idx++] : 0;
  if (idx + typeLen + idLen > msgLen) return false;

  // Type must be the OpenTag3D MIME string
  if (typeLen != sizeof(kMime) - 1) return false;
  if (memcmp(msg + idx, kMime, typeLen) != 0) return false;
  idx += typeLen + idLen;

  if (idx + payloadLen > msgLen) payloadLen = msgLen - idx;  // clamp
  const uint8_t *pl = msg + idx;

  auto have = [&](uint16_t off, uint16_t n) -> bool { return (uint32_t)off + n <= payloadLen; };

  out = FilamentInfo{};
  out.valid = true;
  strncpy(out.manufacturer, manufacturer(), sizeof(out.manufacturer) - 1);

  // Material = base material (0x02, 5B) + modifiers (0x07, 5B)
  char base[8] = {0}, mods[8] = {0};
  if (have(0x02, 5)) copyText(pl + 0x02, 5, base, sizeof(base));
  if (have(0x07, 5)) copyText(pl + 0x07, 5, mods, sizeof(mods));
  snprintf(out.material, sizeof(out.material), "%s%s%s", base, mods[0] ? " " : "", mods);

  if (have(0x4B, 4)) {  // Color 1, sRGB RGBA
    memcpy(out.colorRgba, pl + 0x4B, 4);
    out.hasColor = true;
    snprintf(out.color, sizeof(out.color), "#%02X%02X%02X", pl[0x4B], pl[0x4C], pl[0x4D]);
  }
  if (have(0x5C, 2)) out.diameterMm = readU16BE(pl + 0x5C) / 1000.0f;  // µm -> mm
  if (have(0x5E, 2)) out.nominalWeightGrams = readU16BE(pl + 0x5E);
  if (have(0x60, 1)) {  // Print temperature, °C/5
    out.maxHotendC = (uint16_t)pl[0x60] * 5;
    out.minHotendC = out.maxHotendC;
  }
  return true;
}
