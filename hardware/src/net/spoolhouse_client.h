#pragma once

#include <Arduino.h>

#include "spool/filament_info.h"

// Posts weigh readings to the Spoolhouse REST API (POST /api/v1/spools/weigh),
// which registers-or-refreshes a spool by its NFC tag id.
namespace spoolhouse {

enum class Result { Ok, NoWifi, HttpError };

// Bring up WiFi: try saved/compiled credentials, and if that fails open a setup
// Access Point + captive portal to pick a network, enter its password, and the
// API token / server URL. Blocks until connected (the portal reboots on save).
// onPortalStart(apName) is invoked when the AP opens, so the caller can show a
// setup screen. Call once in setup().
void provision(void (*onPortalStart)(const char *apName));

// Wipe WiFi credentials + stored config and force the setup portal on next
// boot. The caller reboots afterwards.
void factoryReset();

// Reconnect using saved credentials (non-fatal). Returns true if connected.
bool beginWifi(uint32_t timeoutMs = 15000);
bool wifiConnected();

// Send a weigh reading. `grams` is the measured total weight on the scale.
// Tag data from `f` lets the server register the spool on first sight.
// `action` (if non-null) receives "registered"/"refreshed" on success.
Result postWeigh(const FilamentInfo &f, int grams, String *action = nullptr);

}  // namespace spoolhouse
