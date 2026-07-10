#include "spoolhouse_client.h"

#include <HTTPClient.h>
#include <WiFi.h>

#include "config.h"
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

}  // namespace

bool beginWifi(uint32_t timeoutMs) {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(200);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.println("[wifi] connection failed");
  return false;
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
    body += ",\"filamentType\":\"" + jsonEscape(baseType(f.material).c_str()) + "\"";
  }
  if (f.hasColor) body += ",\"color\":\"" + jsonEscape(f.color) + "\"";
  if (f.nominalWeightGrams) body += ",\"fullFilamentWeightGrams\":" + String(f.nominalWeightGrams);
  body += ",\"emptyWeightGrams\":" + String(DEFAULT_EMPTY_SPOOL_G);
  body += "}";

  HTTPClient http;
  http.begin(String(SPOOLHOUSE_URL) + "/api/v1/spools/weigh");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + SPOOLHOUSE_TOKEN);
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
