#pragma once

#include <Arduino.h>

// Tiny in-memory ring of recent log lines, exposed over HTTP at GET /log. The
// device usually has no accessible USB serial (it runs off an external power
// splice), so this is how we see what the NFC/tag-write code actually did.
// Thread-safe: written from the NFC task (core 0), read from the web server
// (core 1).
namespace debuglog {
void add(const String &line);  // also mirrored to Serial
String dump();                 // newest-last, newline-separated
}  // namespace debuglog
