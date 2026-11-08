#pragma once

#include "spool_decoder.h"

// Decodes Creality spool tags: MIFARE Classic 1K with ASCII data in blocks
// 4-6 (sector 1), readable with the default key FF FF FF FF FF FF. The public
// reverse-engineering is incomplete (no reliable weight field), so this
// surfaces manufacturer, material id and colour.
class CrealityDecoder : public SpoolDecoder {
public:
  const char *manufacturer() const override { return "Creality"; }
  bool decode(NfcReader &reader, const NfcUid &uid, FilamentInfo &out) override;
};
