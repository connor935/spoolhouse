#include "scale.h"

#include "config.h"

bool Scale::begin(uint8_t dtPin, uint8_t sckPin, float countsPerGram) {
  _hx711.begin(dtPin, sckPin);
  if (!_hx711.wait_ready_timeout(1000)) return false;
  _hx711.set_scale(countsPerGram);
  // Zero on boot: current load (empty plate, holder, …) becomes the baseline
  _hx711.tare(10);
  _ready = true;
  return true;
}

void Scale::tare() {
  if (!_ready) return;
  _hx711.tare(10);
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
