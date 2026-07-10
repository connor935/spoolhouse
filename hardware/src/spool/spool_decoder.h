#pragma once

#include "filament_info.h"
#include "nfc/nfc_reader.h"

// Abstraction over per-manufacturer spool-tag formats. Each decoder both
// *detects* whether a tag belongs to its manufacturer and *decodes* it into a
// normalized FilamentInfo. This mirrors the NfcReader abstraction: main.cpp
// and the SpoolRegistry never hard-code a manufacturer.
//
// Roadmap: BambuDecoder (MIFARE Classic, HKDF-derived keys) is implemented.
// Creality and the open OpenTag/OpenPrintTag NDEF format are future decoders
// that slot into the same interface — OpenTag is NDEF rather than encrypted
// MIFARE, so it will use a to-be-added NfcReader NDEF read path.
class SpoolDecoder {
public:
  virtual ~SpoolDecoder() = default;

  virtual const char *manufacturer() const = 0;

  // Detect + decode in one call. Returns true only if the tag belongs to this
  // manufacturer AND was decoded; out.manufacturer is filled on success.
  virtual bool decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) = 0;
};
