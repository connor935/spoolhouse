#pragma once

#include "spool_decoder.h"

// Decodes OpenTag3D tags (https://opentag3d.info/spec): an NTAG21x / Type-2
// tag carrying an NDEF record of MIME type "application/opentag3d" whose
// payload is a fixed big-endian binary layout. Parses the Core block (fits
// NTAG213); the Extended block needs a larger tag and isn't required here.
//
// The sibling OpenPrintTag format (specs.openprinttag.org) is similar but
// distinct and is best read with the incoming CLRC663 — left for a future
// decoder in this same interface.
class OpenTagDecoder : public SpoolDecoder {
public:
  const char *manufacturer() const override { return "OpenTag3D"; }
  bool decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) override;
};
