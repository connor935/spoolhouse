#include "debuglog.h"

namespace debuglog {
namespace {
constexpr int CAP = 24;
String g_lines[CAP];
int g_head = 0;  // next slot to write
int g_count = 0;
portMUX_TYPE g_mux = portMUX_INITIALIZER_UNLOCKED;
}  // namespace

void add(const String &line) {
  String stamped = String(millis() / 1000.0f, 1) + "s " + line;
  Serial.println(stamped);
  portENTER_CRITICAL(&g_mux);
  g_lines[g_head] = stamped;
  g_head = (g_head + 1) % CAP;
  if (g_count < CAP) g_count++;
  portEXIT_CRITICAL(&g_mux);
}

String dump() {
  String out;
  portENTER_CRITICAL(&g_mux);
  const int start = (g_head - g_count + CAP) % CAP;
  for (int i = 0; i < g_count; i++) {
    out += g_lines[(start + i) % CAP];
    out += '\n';
  }
  portEXIT_CRITICAL(&g_mux);
  return out;
}

}  // namespace debuglog
