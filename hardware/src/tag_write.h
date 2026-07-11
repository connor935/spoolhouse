#pragma once

#include <Arduino.h>

#include "spool/opentag_decoder.h"  // opentag::TagData

// Coordinates writing an OpenTag3D tag between the web server (core 1, which
// receives the request) and the NFC task (core 0, which owns the reader, sizes
// the record to the tag, and does the actual write). All state is mutex-guarded.
namespace tag_write {

enum class Status : uint8_t { Idle, Waiting, Writing, Done, Failed };

void begin();  // create the mutex; call once in setup()

// ---- web / UI side (core 1) ----
// Queue a tag write from `data`. `label` is shown on the device screen while it
// waits for a tag. Returns false if a write is already in progress.
bool request(const opentag::TagData &data, const String &label);
void cancel();  // abort a pending Waiting write

Status status();
const char *statusText();  // "idle"/"waiting"/"writing"/"done"/"failed"
String label();
String reason();  // human-readable detail for a Failed write ("" otherwise)

// ---- NFC-task side (core 0) ----
void copyData(opentag::TagData &out);  // valid while Waiting/Writing
void setStatus(Status s);
void fail(const String &reason);  // set Failed with a reason

}  // namespace tag_write
