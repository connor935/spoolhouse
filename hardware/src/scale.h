#pragma once

#include <HX711.h>

// HX711 load-cell frontend. Tares on begin(), so whatever sits on the scale
// at boot reads as 0 g; readings are EMA-smoothed.
class Scale {
public:
  // False if the HX711 doesn't respond (check wiring)
  bool begin(uint8_t dtPin, uint8_t sckPin, float countsPerGram);

  // Folds any newly available sample into the smoothed value; cheap to call
  // every loop iteration (the HX711 samples at ~10 Hz).
  void update();

  // Re-zero: the current load becomes the new 0 g baseline.
  void tare();

  // Re-zero by shifting the baseline so a reading of `grams` becomes 0 g —
  // for a zero point averaged externally (e.g. the trimmed tap-to-tare
  // measurement), unlike tare() which samples raw counts itself.
  void tareBy(float grams);

  // One fresh raw reading in grams (blocks until the HX711 is ready, ~100 ms);
  // unsmoothed, for averaging during an upload measurement.
  float readInstant();

  // Set the calibration factor (raw counts per gram) at runtime.
  void setCountsPerGram(float countsPerGram);
  float countsPerGram() const { return _cpg; }

  // Calibrate against a known weight currently on the (already-tared) scale:
  // computes and applies counts-per-gram, returns the new factor. Tare with an
  // empty scale first, then place the known weight and call this.
  float calibrate(float knownGrams);

  float grams() const { return _grams; }
  bool ready() const { return _ready; }

private:
  HX711 _hx711;
  float _cpg = 1.0f;
  float _grams = 0.0f;
  bool _ready = false;
  bool _hasFirstSample = false;
};
