#pragma once

#include "spool_decoder.h"

// Decodes Bambu Lab spool tags: MIFARE Classic 1K with per-sector Key A
// derived from the UID (see bambu_keys.h). Detection = the derived key
// successfully authenticates and reads the tag's data sectors.
class BambuDecoder : public SpoolDecoder {
public:
  const char *manufacturer() const override { return "Bambu Lab"; }
  bool decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) override;
};
