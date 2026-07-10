#pragma once

#include <Arduino.h>

#include "spool/filament_info.h"

// Posts weigh readings to the Spoolhouse REST API (POST /api/v1/spools/weigh),
// which registers-or-refreshes a spool by its NFC tag id.
namespace spoolhouse {

enum class Result { Ok, NoWifi, HttpError };

// Connect to WiFi (non-fatal — the scale still works offline). Returns true if
// connected within the timeout.
bool beginWifi(uint32_t timeoutMs = 15000);
bool wifiConnected();

// Send a weigh reading. `grams` is the measured total weight on the scale.
// Tag data from `f` lets the server register the spool on first sight.
// `action` (if non-null) receives "registered"/"refreshed" on success.
Result postWeigh(const FilamentInfo &f, int grams, String *action = nullptr);

}  // namespace spoolhouse
