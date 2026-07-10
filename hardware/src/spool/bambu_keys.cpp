#include "bambu_keys.h"

#include <mbedtls/md.h>

namespace {
// Fixed HKDF salt ("master key") for Bambu Lab tag key derivation.
const uint8_t kMasterSalt[16] = {0x9a, 0x75, 0x9c, 0xf2, 0xc4, 0xf7, 0xca, 0xff,
                                 0x22, 0x2c, 0xb9, 0x76, 0x9b, 0x41, 0xbc, 0x96};
// HKDF info/context: the ASCII "RFID-A" plus a trailing NUL (7 bytes).
const uint8_t kInfo[7] = {'R', 'F', 'I', 'D', '-', 'A', 0x00};

constexpr size_t kHash = 32;  // SHA-256 output

int hmacSha256(const uint8_t *key, size_t keyLen, const uint8_t *data, size_t dataLen, uint8_t *out) {
  const mbedtls_md_info_t *md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (md == nullptr) return -1;
  return mbedtls_md_hmac(md, key, keyLen, data, dataLen, out);
}

// HKDF-SHA256 (RFC 5869). mbedtls_hkdf isn't compiled into the ESP32 build, so
// this composes it from the always-available HMAC primitive.
bool hkdfSha256(const uint8_t *salt, size_t saltLen, const uint8_t *ikm, size_t ikmLen,
                const uint8_t *info, size_t infoLen, uint8_t *okm, size_t okmLen) {
  uint8_t prk[kHash];
  if (hmacSha256(salt, saltLen, ikm, ikmLen, prk) != 0) return false;  // Extract

  uint8_t t[kHash];
  size_t tLen = 0;
  size_t produced = 0;
  uint8_t counter = 1;
  uint8_t buf[kHash + 64 + 1];  // T(i-1) | info | counter; info here is tiny
  if (infoLen > 64) return false;

  while (produced < okmLen) {  // Expand
    size_t n = 0;
    memcpy(buf + n, t, tLen);
    n += tLen;
    memcpy(buf + n, info, infoLen);
    n += infoLen;
    buf[n++] = counter;
    if (hmacSha256(prk, sizeof(prk), buf, n, t) != 0) return false;
    tLen = kHash;

    const size_t take = (okmLen - produced < kHash) ? (okmLen - produced) : kHash;
    memcpy(okm + produced, t, take);
    produced += take;
    counter++;
  }
  return true;
}
}  // namespace

bool deriveBambuKeys(const uint8_t *uid, size_t uidLen, uint8_t keysOut[16][6]) {
  uint8_t okm[16 * 6] = {0};
  if (!hkdfSha256(kMasterSalt, sizeof(kMasterSalt), uid, uidLen, kInfo, sizeof(kInfo), okm, sizeof(okm))) {
    return false;
  }
  for (uint8_t sector = 0; sector < 16; sector++) {
    memcpy(keysOut[sector], okm + sector * 6, 6);
  }
  return true;
}
