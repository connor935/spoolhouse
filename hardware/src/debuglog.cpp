#include "debuglog.h"

namespace debuglog {
namespace {
constexpr int CAP = 24;
String g_lines[CAP];
int g_head = 0;  // next slot to write
int g_count = 0;
// A mutex, not a spinlock: the String work below allocates, which must not
// happen with interrupts disabled. Created statically so it exists before
// either core logs anything.
StaticSemaphore_t g_mutexBuf;
SemaphoreHandle_t g_mutex = xSemaphoreCreateMutexStatic(&g_mutexBuf);
}  // namespace

void add(const String &line) {
  String stamped = String(millis() / 1000.0f, 1) + "s " + line;
  Serial.println(stamped);
  xSemaphoreTake(g_mutex, portMAX_DELAY);
  g_lines[g_head] = stamped;
  g_head = (g_head + 1) % CAP;
  if (g_count < CAP) g_count++;
  xSemaphoreGive(g_mutex);
}

String dump() {
  String out;
  xSemaphoreTake(g_mutex, portMAX_DELAY);
  const int start = (g_head - g_count + CAP) % CAP;
  for (int i = 0; i < g_count; i++) {
    out += g_lines[(start + i) % CAP];
    out += '\n';
  }
  xSemaphoreGive(g_mutex);
  return out;
}

}  // namespace debuglog
