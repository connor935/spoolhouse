#pragma once

#include <Arduino.h>

// Persistent device configuration (NVS via Preferences). WiFi SSID/password are
// managed by WiFiManager (its own storage); here we keep the Spoolhouse API
// token and server URL, plus a flag that forces the setup portal after a
// factory reset. Compile-time defaults come from secrets.h.
namespace config_store {

String token();      // API bearer token
String serverUrl();  // e.g. "http://192.168.1.197:3000"

void setToken(const String &t);
void setServerUrl(const String &u);

float countsPerGram();  // HX711 calibration factor (raw counts per gram)
void setCountsPerGram(float v);

// True after a factory reset until the device is successfully re-provisioned;
// while set, boot goes straight to the WiFi setup portal (ignores secrets.h).
bool forcePortal();
void setForcePortal(bool v);

// Erase all stored config (token/url/flags). Call on factory reset.
void clearAll();

}  // namespace config_store
