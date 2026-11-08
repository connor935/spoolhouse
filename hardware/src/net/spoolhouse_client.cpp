#include "spoolhouse_client.h"

#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiManager.h>

#include "config.h"
#include "config_store.h"
#include "secrets.h"

namespace spoolhouse {
namespace {

// Minimal JSON string escaping for the short ASCII fields we send.
String jsonEscape(const char *s) {
  String out;
  for (const char *p = s; *p; p++) {
    if (*p == '"' || *p == '\\') out += '\\';
    out += *p;
  }
  return out;
}

// Base filament type = first word of the material name ("PLA Matte" -> "PLA").
String baseType(const char *material) {
  String m = material;
  const int sp = m.indexOf(' ');
  return sp > 0 ? m.substring(0, sp) : m;
}

bool waitConnected(uint32_t timeoutMs) {
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(150);
  }
  return WiFi.status() == WL_CONNECTED;
}

// True if secrets.h holds real WiFi credentials (not the placeholders).
bool secretsHaveWifi() {
  return strlen(WIFI_SSID) > 0 && strcmp(WIFI_SSID, "your-wifi-ssid") != 0;
}

}  // namespace

void provision(void (*onPortalStart)(const char *apName)) {
  WiFi.mode(WIFI_STA);
  // Cap TX power: the CYD's USB power can be marginal, and the radio's current
  // spike at connect can brown out the board (garbled/white screen). 13 dBm is
  // plenty for a home network and much gentler on the supply than the default.
  WiFi.setTxPower(WIFI_POWER_13dBm);

  // 1) Saved credentials (from a previous connect or the portal).
  WiFi.begin();
  if (waitConnected(12000)) {
    Serial.printf("[wifi] connected (saved): %s\n", WiFi.localIP().toString().c_str());
    return;
  }

  // 2) Compiled defaults from secrets.h — unless a factory reset forces setup.
  if (!config_store::forcePortal() && secretsHaveWifi()) {
    Serial.println("[wifi] trying secrets.h credentials");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    if (waitConnected(12000)) {
      Serial.printf("[wifi] connected (secrets): %s\n", WiFi.localIP().toString().c_str());
      return;
    }
  }

  // 3) No connection → open the setup AP + captive portal.
  Serial.println("[wifi] no connection — starting setup portal");
  WiFiManager wm;
  WiFiManagerParameter pToken("token", "Spoolhouse API token (sph_...)", config_store::token().c_str(), 96);
  WiFiManagerParameter pUrl("url", "Spoolhouse base URL", config_store::serverUrl().c_str(), 128);
  wm.addParameter(&pToken);
  wm.addParameter(&pUrl);
  wm.setConfigPortalTimeout(0);  // stay in setup until the user provisions
  if (onPortalStart) {
    wm.setAPCallback([onPortalStart](WiFiManager *) { onPortalStart(PORTAL_AP_NAME); });
  }

  const bool ok = wm.startConfigPortal(PORTAL_AP_NAME);
  if (ok) {
    if (strlen(pToken.getValue())) config_store::setToken(pToken.getValue());
    if (strlen(pUrl.getValue())) config_store::setServerUrl(pUrl.getValue());
    config_store::setForcePortal(false);
    Serial.println("[wifi] provisioned — rebooting");
  }
  delay(300);
  ESP.restart();  // reboot into the normal connect path (or retry the portal)
}

void factoryReset() {
  Serial.println("[cfg] factory reset");
  config_store::clearAll();
  config_store::setForcePortal(true);  // next boot goes straight to setup
  WiFi.disconnect(true, true);         // erase saved WiFi credentials
  delay(300);
}

bool beginWifi(uint32_t timeoutMs) {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.begin();  // saved credentials
  return waitConnected(timeoutMs);
}

bool wifiConnected() { return WiFi.status() == WL_CONNECTED; }

Result postWeigh(const FilamentInfo &f, int grams, String *action) {
  if (WiFi.status() != WL_CONNECTED && !beginWifi(8000)) return Result::NoWifi;

  // Build the JSON body. tagUid is the spool's unique tray id.
  String body = "{";
  body += "\"tagUid\":\"" + jsonEscape(f.spoolId) + "\",";
  body += "\"measuredTotalWeightGrams\":" + String(grams);
  if (f.manufacturer[0]) body += ",\"manufacturer\":\"" + jsonEscape(f.manufacturer) + "\"";
  if (f.material[0]) {
    body += ",\"name\":\"" + jsonEscape(f.material) + "\"";
    // Prefer the tag's explicit type (e.g. Spoolhouse custom tags); otherwise
    // derive it from the material name ("PLA Matte" -> "PLA").
    const String type = f.filamentType[0] ? String(f.filamentType) : baseType(f.material);
    body += ",\"filamentType\":\"" + jsonEscape(type.c_str()) + "\"";
  }
  if (f.hasColor) body += ",\"color\":\"" + jsonEscape(f.color) + "\"";
  if (f.nominalWeightGrams) body += ",\"fullFilamentWeightGrams\":" + String(f.nominalWeightGrams);
  // Empty-spool weight from the tag when known, else the assumed default.
  const int emptyG = f.emptyWeightGrams > 0 ? f.emptyWeightGrams : DEFAULT_EMPTY_SPOOL_G;
  body += ",\"emptyWeightGrams\":" + String(emptyG);
  body += "}";

  HTTPClient http;
  http.begin(config_store::serverUrl() + "/api/v1/spools/weigh");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + config_store::token());
  const int code = http.POST(body);
  const String resp = http.getString();
  http.end();

  Serial.printf("[api] POST weigh -> %d\n", code);
  if (code == 200 || code == 201) {
    if (action) *action = (code == 201) ? "registered" : "refreshed";
    return Result::Ok;
  }
  Serial.printf("[api] error body: %s\n", resp.c_str());
  return Result::HttpError;
}

}  // namespace spoolhouse
