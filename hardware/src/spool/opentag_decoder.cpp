#include "opentag_decoder.h"

#include <ctype.h>
#include <string.h>

namespace {

constexpr uint8_t kStartPage = 4;   // NTAG user memory starts at page 4
constexpr uint8_t kMinPages = 36;   // 144 bytes — NTAG213 user memory
constexpr uint8_t kMaxPages = 55;   // 220 bytes — enough to reach the 0xAC field

const char kMime[] = "application/opentag3d";

// OpenTag3D payload field offsets (see https://opentag3d.info/spec).
constexpr uint16_t OFF_VERSION = 0x00;    // u16, format version (1000 = v1.000)
constexpr uint16_t OFF_BASE = 0x02;       // 5B, base material ("PLA")
constexpr uint16_t OFF_MODS = 0x07;       // 5B, modifiers ("CF", "Silk")
constexpr uint16_t OFF_MANU = 0x1B;       // 16B, manufacturer
constexpr uint16_t OFF_COLORNAME = 0x2B;  // 32B, colour/product name
constexpr uint16_t OFF_COLOR1 = 0x4B;     // 4B, RGBA
constexpr uint16_t OFF_DIAM = 0x5C;       // u16, diameter µm
constexpr uint16_t OFF_WEIGHT = 0x5E;     // u16, net filament weight g
constexpr uint16_t OFF_PRINTTEMP = 0x60;  // u8, °C/5
constexpr uint16_t OFF_EMPTY = 0xAC;      // u16, empty-spool weight g

constexpr uint16_t CORE_PAYLOAD = 0x62;             // fits NTAG213 (no empty-weight field)
constexpr uint16_t FULL_PAYLOAD = OFF_EMPTY + 2;    // 0xAE, needs NTAG215/216

uint16_t readU16BE(const uint8_t *p) { return ((uint16_t)p[0] << 8) | p[1]; }
void writeU16BE(uint8_t *p, uint16_t v) {
  p[0] = (uint8_t)(v >> 8);
  p[1] = (uint8_t)(v & 0xFF);
}

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

// Write a C string into a fixed-width payload field (buffer pre-zeroed).
void putText(uint8_t *payload, uint16_t off, uint16_t cap, const char *s) {
  size_t n = strnlen(s, cap);
  memcpy(payload + off, s, n);
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

namespace opentag {

size_t buildImage(const TagData &d, uint16_t tagCapacityBytes, uint8_t *out) {
  // Include the empty-spool-weight field only when we have a value AND the tag
  // is large enough to reach offset 0xAC (NTAG215/216, not NTAG213).
  const bool full = d.emptyWeightGrams > 0 && tagCapacityBytes >= 204;
  const uint16_t payloadLen = full ? FULL_PAYLOAD : CORE_PAYLOAD;

  uint8_t pl[FULL_PAYLOAD] = {0};
  writeU16BE(pl + OFF_VERSION, 1000);  // v1.000
  putText(pl, OFF_BASE, 5, d.type);
  putText(pl, OFF_MANU, 16, d.manufacturer);
  putText(pl, OFF_COLORNAME, 32, d.name);
  if (d.hasColor) {
    pl[OFF_COLOR1 + 0] = d.rgb[0];
    pl[OFF_COLOR1 + 1] = d.rgb[1];
    pl[OFF_COLOR1 + 2] = d.rgb[2];
    pl[OFF_COLOR1 + 3] = 0xFF;
  }
  writeU16BE(pl + OFF_DIAM, 1750);  // default 1.75 mm
  writeU16BE(pl + OFF_WEIGHT, d.nominalWeightGrams);
  if (full) writeU16BE(pl + OFF_EMPTY, d.emptyWeightGrams);

  const uint8_t typeLen = sizeof(kMime) - 1;         // 21
  const uint16_t msgLen = 3 + typeLen + payloadLen;  // record header + payload (<255)

  size_t i = 0;
  out[i++] = 0x03;                 // NDEF Message TLV
  out[i++] = (uint8_t)msgLen;      // 1-byte length form (msgLen < 255 here)
  out[i++] = 0xD2;                 // MB|ME|SR|TNF=MIME
  out[i++] = typeLen;              // type length
  out[i++] = (uint8_t)payloadLen;  // payload length
  memcpy(out + i, kMime, typeLen);
  i += typeLen;
  memcpy(out + i, pl, payloadLen);
  i += payloadLen;
  out[i++] = 0xFE;         // terminator
  while (i % 4) out[i++] = 0x00;  // pad to a whole page

  if (i > tagCapacityBytes) return 0;  // tag too small even for the core record
  return i;
}

}  // namespace opentag

bool OpenTagDecoder::decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) {
  if (!reader.supportsNtag()) return false;

  // Read enough pages for this tag: the capability container (page 3, byte 2 ×8
  // = user bytes) tells us the size, so a big tag's far fields are reachable
  // without over-reading a small one.
  uint8_t cc[4] = {0};
  uint16_t capacity = 144;
  if (reader.readNtagPages(uid, 3, 1, cc) && cc[2]) capacity = (uint16_t)cc[2] * 8;
  uint8_t pages = (uint8_t)constrain((int)(capacity / 4), (int)kMinPages, (int)kMaxPages);

  uint8_t buf[kMaxPages * 4];
  if (!reader.readNtagPages(uid, kStartPage, pages, buf)) {
    pages = kMinPages;  // some tags report a bogus CC — fall back to NTAG213 size
    if (!reader.readNtagPages(uid, kStartPage, pages, buf)) return false;
  }
  const uint16_t bufLen = (uint16_t)pages * 4;

  uint16_t msgOff = 0, msgLen = 0;
  if (!findNdefMessage(buf, bufLen, msgOff, msgLen)) return false;
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

  // Base material -> filament type; modifiers append to a fallback name.
  char base[8] = {0}, mods[8] = {0};
  if (have(OFF_BASE, 5)) copyText(pl + OFF_BASE, 5, base, sizeof(base));
  if (have(OFF_MODS, 5)) copyText(pl + OFF_MODS, 5, mods, sizeof(mods));
  strncpy(out.filamentType, base, sizeof(out.filamentType) - 1);

  // Manufacturer (0x1B); fall back to the format name if absent.
  char manu[16] = {0};
  if (have(OFF_MANU, 16)) copyText(pl + OFF_MANU, 16, manu, sizeof(manu));
  strncpy(out.manufacturer, manu[0] ? manu : manufacturer(), sizeof(out.manufacturer) - 1);

  // Colour name (0x2B) is Spoolhouse's material/product name; else base+mods.
  char colorName[32] = {0};
  if (have(OFF_COLORNAME, 32)) copyText(pl + OFF_COLORNAME, 32, colorName, sizeof(colorName));
  if (colorName[0]) {
    strncpy(out.material, colorName, sizeof(out.material) - 1);
  } else {
    snprintf(out.material, sizeof(out.material), "%s%s%s", base, mods[0] ? " " : "", mods);
  }

  if (have(OFF_COLOR1, 4)) {  // Color 1, sRGB RGBA
    memcpy(out.colorRgba, pl + OFF_COLOR1, 4);
    out.hasColor = true;
    snprintf(out.color, sizeof(out.color), "#%02X%02X%02X", pl[OFF_COLOR1], pl[OFF_COLOR1 + 1],
             pl[OFF_COLOR1 + 2]);
  }
  if (have(OFF_DIAM, 2)) out.diameterMm = readU16BE(pl + OFF_DIAM) / 1000.0f;  // µm -> mm
  if (have(OFF_WEIGHT, 2)) out.nominalWeightGrams = readU16BE(pl + OFF_WEIGHT);
  if (have(OFF_PRINTTEMP, 1)) {  // print temperature, °C/5
    out.maxHotendC = (uint16_t)pl[OFF_PRINTTEMP] * 5;
    out.minHotendC = out.maxHotendC;
  }
  if (have(OFF_EMPTY, 2)) out.emptyWeightGrams = readU16BE(pl + OFF_EMPTY);

  // The tag's own UID is the unique spool id (for register/refresh).
  strncpy(out.spoolId, uid.toHexString().c_str(), sizeof(out.spoolId) - 1);
  return true;
}
