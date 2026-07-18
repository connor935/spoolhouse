#include "scale.h"

#include "config.h"

bool Scale::begin(uint8_t dtPin, uint8_t sckPin, float countsPerGram) {
  _hx711.begin(dtPin, sckPin);
  if (!_hx711.wait_ready_timeout(1000)) return false;
  _cpg = countsPerGram;
  _hx711.set_scale(_cpg);
  // Zero on boot: current load (empty plate, holder, …) becomes the baseline
  _hx711.tare(10);
  _ready = true;
  return true;
}

void Scale::setCountsPerGram(float countsPerGram) {
  _cpg = countsPerGram;
  if (_ready) _hx711.set_scale(_cpg);
}

float Scale::calibrate(float knownGrams) {
  if (!_ready || knownGrams <= 0.0f) return _cpg;
  // Raw counts (already minus tare offset) for the known weight → counts/gram.
  const long raw = _hx711.get_value(10);
  const float factor = (float)raw / knownGrams;
  if (isfinite(factor) && factor != 0.0f) {
    _cpg = factor;
    _hx711.set_scale(_cpg);
  }
  return _cpg;
}

void Scale::tare() {
  if (!_ready) return;
  _hx711.tare(10);
  _grams = 0.0f;
  _hasFirstSample = false;
}

void Scale::tareBy(float grams) {
  if (!_ready) return;
  // get_units = (raw − offset) / cpg, so shifting the offset by grams·cpg
  // moves the zero point onto the measured value.
  _hx711.set_offset(_hx711.get_offset() + (long)lroundf(grams * _cpg));
  _grams = 0.0f;
  _hasFirstSample = false;
}

float Scale::readInstant() {
  if (!_ready) return _grams;
  return _hx711.get_units(1);
}

void Scale::update() {
  if (!_ready || !_hx711.is_ready()) return;
  const float sample = _hx711.get_units(1);
  if (!_hasFirstSample) {
    _grams = sample;
    _hasFirstSample = true;
    return;
  }
  _grams += WEIGHT_EMA_ALPHA * (sample - _grams);
}
