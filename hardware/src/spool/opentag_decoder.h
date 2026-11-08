#pragma once

#include "spool_decoder.h"

// OpenTag3D (https://opentag3d.info/spec): an NTAG21x / Type-2 tag carrying an
// NDEF record of MIME type "application/opentag3d" whose payload is a fixed
// big-endian binary layout. This file both DECODES such tags and ENCODES them
// (the device writes them onto blank tags for "dumb" spools — see tag_write).
//
// The sibling OpenPrintTag format (specs.openprinttag.org) is similar but
// distinct and is best read with the incoming CLRC663 — left for a future
// decoder in this same interface.

namespace opentag {

constexpr uint8_t START_PAGE = 4;   // NTAG user memory / NDEF area starts here
constexpr size_t MAX_IMAGE = 224;   // page-aligned buffer big enough for the full record

// Spoolhouse traits to write onto a tag. Maps onto OpenTag3D fields:
//   manufacturer -> Filament Manufacturer (0x1B)
//   name         -> Color Name (0x2B)   (Spoolhouse's product/colour name)
//   type         -> Base Material (0x02) ("PLA", "PETG", …)
//   rgb          -> Color 1 (0x4B)
//   nominal      -> Target Weight (0x5E)
//   empty        -> Empty Spool Weight (0xAC)  (only if the tag is large enough)
struct TagData {
  char manufacturer[16] = {0};
  char name[32] = {0};
  char type[8] = {0};
  uint8_t rgb[3] = {0};
  bool hasColor = false;
  uint16_t nominalWeightGrams = 0;
  uint16_t emptyWeightGrams = 0;  // 0 = unknown / don't write
};

// Build the NDEF NTAG image (starting at START_PAGE) for `d`, sized to fit a
// tag with `tagCapacityBytes` of user memory. Includes the empty-spool-weight
// field only when it fits (NTAG215/216). Writes into out (>= MAX_IMAGE) and
// returns the page-aligned byte length to write, or 0 if the tag is too small.
size_t buildImage(const TagData &d, uint16_t tagCapacityBytes, uint8_t *out);

}  // namespace opentag

class OpenTagDecoder : public SpoolDecoder {
public:
  const char *manufacturer() const override { return "OpenTag3D"; }
  bool decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) override;
};
