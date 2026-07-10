#pragma once

#include "spool_decoder.h"

// Tries each registered decoder in order and returns the first match. Decoders
// are held by pointer and owned elsewhere (statically in main.cpp).
class SpoolRegistry {
public:
  void add(SpoolDecoder *decoder) {
    if (_count < kMax) _decoders[_count++] = decoder;
  }

  // Returns true and fills out if any decoder recognizes the tag.
  bool identify(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) {
    for (uint8_t i = 0; i < _count; i++) {
      if (_decoders[i]->decode(reader, uid, out)) return true;
    }
    return false;
  }

private:
  static constexpr uint8_t kMax = 8;
  SpoolDecoder *_decoders[kMax] = {nullptr};
  uint8_t _count = 0;
};
