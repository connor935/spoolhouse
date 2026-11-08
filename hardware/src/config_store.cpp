#include "config_store.h"

#include <Preferences.h>

#include "config.h"   // HX711_COUNTS_PER_GRAM default
#include "secrets.h"

namespace config_store {
namespace {
constexpr const char *NS = "spoolhouse";

String getStr(const char *key, const char *fallback) {
  Preferences p;
  p.begin(NS, true);  // read-only
  String v = p.getString(key, fallback);
  p.end();
  return v;
}

void putStr(const char *key, const String &val) {
  Preferences p;
  p.begin(NS, false);
  p.putString(key, val);
  p.end();
}
}  // namespace

String token() { return getStr("token", SPOOLHOUSE_TOKEN); }
String serverUrl() { return getStr("url", SPOOLHOUSE_URL); }

void setToken(const String &t) { putStr("token", t); }
void setServerUrl(const String &u) { putStr("url", u); }

float countsPerGram() {
  Preferences p;
  p.begin(NS, true);
  float v = p.getFloat("cpg", HX711_COUNTS_PER_GRAM);
  p.end();
  return v;
}

void setCountsPerGram(float v) {
  Preferences p;
  p.begin(NS, false);
  p.putFloat("cpg", v);
  p.end();
}

bool forcePortal() {
  Preferences p;
  p.begin(NS, true);
  bool v = p.getBool("force_portal", false);
  p.end();
  return v;
}

void setForcePortal(bool v) {
  Preferences p;
  p.begin(NS, false);
  p.putBool("force_portal", v);
  p.end();
}

void clearAll() {
  Preferences p;
  p.begin(NS, false);
  p.clear();
  p.end();
}

}  // namespace config_store
