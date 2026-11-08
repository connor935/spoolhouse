#include "tag_write.h"

#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <string.h>

namespace tag_write {
namespace {

SemaphoreHandle_t g_mutex = nullptr;
Status g_status = Status::Idle;
opentag::TagData g_data;
String g_label;
String g_reason;

struct Lock {
  Lock() {
    if (g_mutex) xSemaphoreTake(g_mutex, portMAX_DELAY);
  }
  ~Lock() {
    if (g_mutex) xSemaphoreGive(g_mutex);
  }
};

}  // namespace

void begin() {
  if (!g_mutex) g_mutex = xSemaphoreCreateMutex();
}

bool request(const opentag::TagData &data, const String &label) {
  Lock l;
  if (g_status == Status::Waiting || g_status == Status::Writing) return false;
  g_data = data;
  g_label = label;
  g_reason = "";
  g_status = Status::Waiting;
  return true;
}

void cancel() {
  Lock l;
  if (g_status == Status::Waiting) g_status = Status::Idle;
}

Status status() {
  Lock l;
  return g_status;
}

const char *statusText() {
  switch (status()) {
    case Status::Waiting: return "waiting";
    case Status::Writing: return "writing";
    case Status::Done: return "done";
    case Status::Failed: return "failed";
    default: return "idle";
  }
}

String label() {
  Lock l;
  return g_label;
}

String reason() {
  Lock l;
  return g_reason;
}

void fail(const String &reason) {
  Lock l;
  g_reason = reason;
  g_status = Status::Failed;
}

void copyData(opentag::TagData &out) {
  Lock l;
  out = g_data;
}

void setStatus(Status s) {
  Lock l;
  g_status = s;
}

}  // namespace tag_write
