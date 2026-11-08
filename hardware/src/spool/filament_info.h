#pragma once

#include <Arduino.h>

// Normalized filament description decoded from a spool's RFID tag, independent
// of which manufacturer's tag format it came from. Decoders fill whatever
// fields their format provides; unset fields keep their defaults.
struct FilamentInfo {
  bool valid = false;

  char manufacturer[16] = {0};  // "Bambu Lab", "Creality", …
  char material[24] = {0};      // "PLA Basic", "PETG HF", …
  char filamentType[12] = {0};  // base type "PLA"/"PETG"/… (empty = derive from material)
  char color[10] = {0};         // "#FF0000" (RGB hex) — logged, not shown

  uint8_t colorRgba[4] = {0};   // raw RGBA, valid when hasColor
  bool hasColor = false;

  uint16_t nominalWeightGrams = 0;  // labelled filament weight (e.g. 1000)
  uint16_t emptyWeightGrams = 0;    // empty-spool weight (0 = unknown, use default)
  float diameterMm = 0.0f;          // 1.75 / 2.85
  uint16_t lengthMeters = 0;
  float spoolWidthMm = 0.0f;
  uint16_t minHotendC = 0;  // parsed but not shown
  uint16_t maxHotendC = 0;

  char sku[12] = {0};             // material variant / SKU, e.g. "A00-K0"
  char materialId[12] = {0};      // internal material id, e.g. "GFA00"
  char spoolId[33] = {0};         // unique per-spool id (Bambu tray UID, hex)
  char productionDate[20] = {0};  // "YYYY_MM_DD_HH_MM"

  // Standard RGB565 of the filament colour, for a TFT swatch. (The CYD panel
  // runs with display inversion enabled in setup(), which corrects colours.)
  uint16_t swatchColor565() const {
    return ((colorRgba[0] & 0xF8) << 8) | ((colorRgba[1] & 0xFC) << 3) | (colorRgba[2] >> 3);
  }
};
