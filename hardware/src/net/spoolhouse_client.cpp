#include "spoolhouse_client.h"

#include <HTTPClient.h>
#include <ctype.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <esp_wifi.h>

#include "config.h"
#include "config_store.h"
#include "secrets.h"

namespace spoolhouse {
namespace {

// Length of the valid UTF-8 sequence starting at p, or 0 if it isn't one.
int utf8SeqLen(const unsigned char *p) {
  int n;
  if (p[0] >= 0xC2 && p[0] <= 0xDF) n = 2;
  else if (p[0] >= 0xE0 && p[0] <= 0xEF) n = 3;
  else if (p[0] >= 0xF0 && p[0] <= 0xF4) n = 4;
  else return 0;
  for (int i = 1; i < n; i++) {
    if ((p[i] & 0xC0) != 0x80) return 0;  // also stops at the terminating NUL
  }
  return n;
}

// JSON string escaping for fields that come straight off a tag: control
// characters become \u00XX and bytes that aren't valid UTF-8 (e.g. Latin-1)
// become '?', so an odd tag can't make the whole request body invalid.
String jsonEscape(const char *s) {
  String out;
  for (const unsigned char *p = (const unsigned char *)s; *p;) {
    if (*p == '"' || *p == '\\') {
      out += '\\';
      out += (char)*p++;
    } else if (*p < 0x20) {
      char buf[7];
      snprintf(buf, sizeof(buf), "\\u%04x", *p++);
      out += buf;
    } else if (*p < 0x80) {
      out += (char)*p++;
    } else if (const int n = utf8SeqLen(p)) {
      for (int i = 0; i < n; i++) out += (char)*p++;
    } else {
      out += '?';
      p++;
    }
  }
  return out;
}

// Map a tag's type or material name onto the server's FILAMENT_TYPES
// (lib/filament.ts) by its leading token: "PLA-CF"/"PLA Matte" -> "PLA",
// "PET-G"/"PETG HF" -> "PETG", "PA6-CF"/"PAHT-CF"/"PA" -> "Nylon". Anything
// else returns "" and the field is omitted — the server then files the
// material under "Other" instead of rejecting the whole registration.
String serverFilamentType(const char *raw) {
  String s = raw;
  s.trim();
  s.toUpperCase();
  if (s.startsWith("PET-G") || s.startsWith("PETG")) return "PETG";
  int end = 0;
  while (end < (int)s.length() && isalnum((unsigned char)s[end])) end++;
  const String tok = s.substring(0, end);
  static const char *const kSame[][2] = {
      {"PLA", "PLA"}, {"ABS", "ABS"}, {"ASA", "ASA"}, {"TPU", "TPU"},
      {"PC", "PC"},   {"PVA", "PVA"}, {"HIPS", "HIPS"}, {"NYLON", "Nylon"},
  };
  for (const auto &t : kSame) {
    if (tok == t[0]) return t[1];
  }
  // Polyamides: PA, PA6, PA12, PAHT, … (but not PAxx look-alikes like "PASTEL")
  if (tok == "PA" || tok == "PAHT" || (tok.startsWith("PA") && tok.length() > 2 && isdigit((unsigned char)tok[2]))) {
    return "Nylon";
  }
  return "";
}

bool waitConnected(uint32_t timeoutMs) {
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(150);
  }
  return WiFi.status() == WL_CONNECTED;
}

// True if the WiFi driver has credentials saved from an earlier connect.
bool hasSavedWifi() {
  wifi_config_t conf;
  return esp_wifi_get_config(WIFI_IF_STA, &conf) == ESP_OK && conf.sta.ssid[0] != 0;
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
  // With known credentials the network is most likely just not up yet (the
  // scale boots faster than the router after a power cut): give the portal a
  // few minutes, then reboot and retry them. Unprovisioned, wait for setup.
  const bool haveCredentials = !config_store::forcePortal() && (hasSavedWifi() || secretsHaveWifi());
  wm.setConfigPortalTimeout(haveCredentials ? 180 : 0);
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
    // derive it from the material name ("PLA Matte" -> "PLA"). Omitted when
    // neither maps to a server type (the server then uses "Other").
    String type = f.filamentType[0] ? serverFilamentType(f.filamentType) : String();
    if (!type.length()) type = serverFilamentType(f.material);
    if (type.length()) body += ",\"filamentType\":\"" + type + "\"";
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
