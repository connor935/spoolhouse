#include "web_config.h"

#include <ESPmDNS.h>
#include <Update.h>
#include <WebServer.h>
#include <esp_random.h>

#include "config_store.h"
#include "debuglog.h"
#include "scale.h"
#include "tag_write.h"  // pulls in opentag::TagData

namespace web_config {
namespace {

WebServer server(80);
Scale *g_scale = nullptr;
StatusFn g_status = nullptr;
ResetDisplayFn g_resetDisplay = nullptr;
bool g_updateRejected = false;  // set when an /update POST fails the CSRF check
// Random per-boot CSRF token: embedded as a hidden field in every form and
// re-checked on POST, so a page on another origin can't silently submit here
// (it can't read this token due to the same-origin policy). No login is
// required — the page is open on the LAN by design.
String g_csrf;

// Reject POSTs whose CSRF token doesn't match this boot's token.
bool checkCsrf() {
  if (server.arg("csrf") != g_csrf) {
    server.send(403, "text/plain", "bad csrf token");
    return false;
  }
  return true;
}

String esc(const String &s) {
  String o;
  for (size_t i = 0; i < s.length(); i++) {
    const char c = s[i];
    if (c == '&') o += "&amp;";
    else if (c == '<') o += "&lt;";
    else if (c == '>') o += "&gt;";
    else if (c == '"') o += "&quot;";
    else o += c;
  }
  return o;
}

String csrfField() { return "<input type=hidden name=csrf value='" + g_csrf + "'>"; }

String page() {
  const String url = config_store::serverUrl();
  const float cpg = g_scale ? g_scale->countsPerGram() : config_store::countsPerGram();
  const int grams = g_scale ? (int)lroundf(g_scale->grams()) : 0;

  String h;
  h.reserve(5000);
  // Design tokens mirror the Spoolhouse web app (app/globals.css): petrol/blue
  // accent, cool neutrals, 0.5rem radius, light + dark via prefers-color-scheme.
  h += F("<!doctype html><html lang=en><head><meta charset=utf-8>"
         "<meta name=viewport content='width=device-width,initial-scale=1'>"
         "<title>Spoolhouse scale</title><style>"
         ":root{--bg:oklch(.985 .004 220);--fg:oklch(.22 .03 240);--card:oklch(1 0 0);"
         "--primary:oklch(.28 .05 230);--primary-fg:oklch(.985 .004 220);--mut:oklch(.5 .02 240);"
         "--accent:oklch(.52 .09 210);--accent-fg:oklch(.99 .005 210);--border:oklch(.9 .012 220);"
         "--input:oklch(.9 .012 220);--ring:oklch(.52 .09 210);--r:.5rem}"
         "@media(prefers-color-scheme:dark){:root{--bg:oklch(.17 .02 235);--fg:oklch(.96 .005 220);"
         "--card:oklch(.21 .025 235);--primary:oklch(.96 .005 220);--primary-fg:oklch(.21 .025 235);"
         "--mut:oklch(.68 .02 235);--accent:oklch(.6 .1 205);--accent-fg:oklch(.14 .02 220);"
         "--border:oklch(1 0 0 / 12%);--input:oklch(1 0 0 / 15%);--ring:oklch(.6 .1 205)}}"
         "*{box-sizing:border-box}"
         "body{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;"
         "background:var(--bg);color:var(--fg);max-width:34rem;margin:0 auto;padding:1.25rem 1rem 3rem;"
         "line-height:1.5;-webkit-font-smoothing:antialiased}"
         "header{display:flex;align-items:center;gap:.7rem;margin:.3rem 0 1.2rem}"
         ".logo{width:2.1rem;height:2.1rem;border-radius:var(--r);background:var(--accent);"
         "color:var(--accent-fg);display:grid;place-items:center;font-weight:700}"
         "h1{font-size:1.3rem;font-weight:600;letter-spacing:-.01em;margin:0}"
         ".sub{color:var(--mut);font-size:.82rem;margin:.1rem 0 0}"
         ".card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);"
         "padding:1.1rem;margin:.85rem 0}"
         ".card h2{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;"
         "color:var(--mut);margin:0 0 .7rem}"
         "label{display:block;font-size:.82rem;color:var(--mut);margin:.55rem 0 .25rem}"
         "input{width:100%;padding:.55rem .7rem;border:1px solid var(--input);border-radius:calc(var(--r)*.8);"
         "background:var(--bg);color:var(--fg);font-size:.95rem;outline:none}"
         "input:focus{border-color:var(--ring);box-shadow:0 0 0 3px var(--ring)}"
         "input[type=file]{padding:.4rem;color:var(--mut)}"
         "button{margin-top:.9rem;width:100%;padding:.62rem 1rem;border:0;border-radius:calc(var(--r)*.8);"
         "background:var(--accent);color:var(--accent-fg);font-size:.95rem;font-weight:600;cursor:pointer}"
         "button:hover{opacity:.9}.weight{font-size:2.6rem;font-weight:700;letter-spacing:-.02em}"
         ".muted{color:var(--mut);font-size:.82rem;margin:.2rem 0 .5rem}"
         "</style></head><body>"
         "<header><div class=logo>S</div><div><h1>Spoolhouse scale</h1>"
         "<p class=sub>Device configuration</p></div></header>");

  h += F("<form class=card action=/tare method=post><h2>Weight</h2><div class=weight id=w>");
  h += String(grams);
  h += F(" g</div>");
  h += csrfField();
  h += F("<button type=submit>Tare (zero)</button></form>");

  h += F("<form class=card action=/calibrate method=post><h2>Calibrate</h2>"
         "<p class=muted>Tare empty, place a known weight, enter its grams, then Calibrate.</p>"
         "<label>Known weight (g)</label>"
         "<input name=known type=number step=1 placeholder='e.g. 500'>"
         "<p class=muted>Current: ");
  h += String(cpg, 2);
  h += F(" counts/gram</p>");
  h += csrfField();
  h += F("<button type=submit>Calibrate</button></form>");

  h += F("<form class=card action=/save method=post><h2>Spoolhouse server</h2>"
         "<label>Base URL</label><input name=url value='");
  h += esc(url);
  h += F("'><label>API token</label>"
         "<input name=token type=password placeholder='leave blank to keep current'>");
  h += csrfField();
  h += F("<button type=submit>Save</button></form>");

  // Write a custom tag for a "dumb" (tag-less) spool. Fills a blank NTAG so the
  // scale recognises it like a smart spool. JS-driven: POST /write-tag, then
  // poll /write-status while the device waits for a tag to be presented.
  h += F("<div class=card><h2>Write custom tag</h2>"
         "<p class=muted>Encode a blank NFC tag (NTAG21x) for a spool that has none. "
         "Fill in the details, press Write, then hold the tag to the reader.</p>"
         "<label>Manufacturer</label><input id=t_manu placeholder='e.g. Generic'>"
         "<label>Material name</label><input id=t_name placeholder='e.g. PLA Matte'>"
         "<label>Filament type</label><input id=t_type placeholder='e.g. PLA'>"
         "<label>Colour</label><input id=t_color type=color value='#3366aa'>"
         "<label>Nominal filament weight (g)</label>"
         "<input id=t_nominal type=number step=1 value=1000>"
         "<label>Empty-spool weight (g)</label>"
         "<input id=t_empty type=number step=1 value=250>"
         "<button type=button id=t_btn onclick='writeTag()'>Write tag</button>"
         "<p id=t_status class=muted style='margin-top:.7rem'></p></div>");

  // Recover a glitched/white display without a power cycle (the ESP32 keeps
  // running on WiFi even when the panel drops out).
  h += F("<form class=card action=/reset-display method=post><h2>Display</h2>"
         "<p class=muted>Re-initialise the screen if it has gone blank or white.</p>");
  h += csrfField();
  h += F("<button type=submit>Reset display</button></form>");

  // Firmware upload (browser OTA). The CSRF field comes FIRST so it is parsed
  // before the file part and is available when the upload handler starts.
  h += F("<form class=card method=post action=/update enctype='multipart/form-data'>"
         "<h2>Firmware update</h2>");
  h += csrfField();
  h += F("<p class=muted>Upload a .bin (.pio/build/cyd/firmware.bin). The device reboots when done.</p>"
         "<input type=file name=firmware accept='.bin'>"
         "<button type=submit>Upload &amp; flash</button></form>");

  h += F("<script>var CSRF='");
  h += g_csrf;
  h += F("';var $=function(i){return document.getElementById(i)};"
         "setInterval(function(){fetch('/weight').then(r=>r.text())"
         ".then(t=>{$('w').textContent=t+' g'})},700);"
         "var poll=null;"
         "function stopPoll(){if(poll){clearInterval(poll);poll=null;}}"
         "function writeTag(){var st=$('t_status');"
         "if(!$('t_name').value){st.textContent='Enter a material name first.';return;}"
         "var b=new URLSearchParams();b.set('csrf',CSRF);"
         "b.set('manufacturer',$('t_manu').value);b.set('name',$('t_name').value);"
         "b.set('type',$('t_type').value);b.set('color',$('t_color').value);"
         "b.set('nominal',$('t_nominal').value);b.set('empty',$('t_empty').value);"
         "fetch('/write-tag',{method:'POST',body:b}).then(function(r){"
         "if(!r.ok){st.textContent='Busy or invalid \\u2014 try again.';return;}"
         "$('t_btn').disabled=true;st.textContent='Hold a blank tag to the reader\\u2026 ';"
         "var c=document.createElement('a');c.href='#';c.textContent='cancel';"
         "c.onclick=function(e){e.preventDefault();var x=new URLSearchParams();x.set('csrf',CSRF);"
         "fetch('/write-cancel',{method:'POST',body:x});};st.appendChild(c);"
         "stopPoll();poll=setInterval(function(){fetch('/write-status').then(r=>r.json()).then(function(s){"
         "if(s.status=='waiting'||s.status=='writing')return;stopPoll();$('t_btn').disabled=false;"
         "st.textContent=s.status=='done'?'Tag written \\u2014 place the spool to weigh it.':"
         "(s.status=='failed'?('Write failed \\u2014 '+(s.reason||'use a blank NTAG21x tag.')):'Cancelled.');"
         "});},800);});}"
         "</script>");
  h += F("</body></html>");
  return h;
}

void redirectHome() {
  server.sendHeader("Location", "/");
  server.send(303, "text/plain", "");
}

void handleRoot() { server.send(200, "text/html", page()); }

void handleWeight() {
  server.send(200, "text/plain", g_scale ? String((int)lroundf(g_scale->grams())) : "0");
}

void handleTare() {
  if (!checkCsrf()) return;
  if (g_scale) g_scale->tare();
  redirectHome();
}

void handleCalibrate() {
  if (!checkCsrf()) return;
  const float known = server.arg("known").toFloat();
  if (g_scale && known > 0.0f) {
    const float factor = g_scale->calibrate(known);
    config_store::setCountsPerGram(factor);
  }
  redirectHome();
}

void handleSave() {
  if (!checkCsrf()) return;
  if (server.hasArg("url")) {
    const String u = server.arg("url");
    if (u.length()) config_store::setServerUrl(u);
  }
  if (server.hasArg("token")) {
    const String t = server.arg("token");
    if (t.length()) config_store::setToken(t);  // blank = keep current
  }
  redirectHome();
}

// Streams an uploaded .bin straight into the inactive OTA partition.
void handleUpdateUpload() {
  HTTPUpload &up = server.upload();
  if (up.status == UPLOAD_FILE_START) {
    // The csrf field precedes the file part, so it's parsed by now. Reject
    // cross-origin uploads (which can't read this boot's token).
    g_updateRejected = (server.arg("csrf") != g_csrf);
    if (g_updateRejected) {
      Serial.println("[update] rejected: bad csrf");
      return;
    }
    if (g_status) g_status("Firmware update", "receiving...");
    Serial.printf("[update] start: %s\n", up.filename.c_str());
    if (!Update.begin(UPDATE_SIZE_UNKNOWN)) Update.printError(Serial);
  } else if (up.status == UPLOAD_FILE_WRITE) {
    if (g_updateRejected) return;
    if (Update.write(up.buf, up.currentSize) != up.currentSize) Update.printError(Serial);
    if (g_status) {
      char b[24];
      snprintf(b, sizeof(b), "%u KB", (unsigned)(up.totalSize / 1024));
      g_status("Firmware update", b);
    }
  } else if (up.status == UPLOAD_FILE_END) {
    if (g_updateRejected) return;
    if (Update.end(true)) {
      Serial.printf("[update] ok: %u bytes\n", (unsigned)up.totalSize);
      if (g_status) g_status("Update complete", "rebooting");
    } else {
      Update.printError(Serial);
      if (g_status) g_status("Update failed", "");
    }
  }
}

void handleUpdateDone() {
  if (g_updateRejected) {
    g_updateRejected = false;
    server.send(403, "text/plain", "bad csrf token");
    return;
  }
  const bool ok = !Update.hasError();
  server.send(200, "text/html",
              ok ? F("<!doctype html><meta charset=utf-8><body style='font-family:sans-serif'>"
                     "<p>Update OK - rebooting...</p>")
                 : F("<!doctype html><meta charset=utf-8><body style='font-family:sans-serif'>"
                     "<p>Update FAILED. <a href=/>back</a></p>"));
  if (ok) {
    delay(800);
    ESP.restart();
  }
}

// Parse two hex chars at s[i..i+1] into a byte (0 on malformed input).
uint8_t hexByte(const String &s, int i) {
  auto nib = [](char c) -> int {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return 0;
  };
  if (i + 1 >= (int)s.length()) return 0;
  return (uint8_t)((nib(s[i]) << 4) | nib(s[i + 1]));
}

// Queue writing a custom Spoolhouse tag from the form fields. The NFC task
// (core 0) performs the actual write once a tag is presented.
void handleWriteTag() {
  if (!checkCsrf()) return;
  const String name = server.arg("name");
  if (!name.length()) {
    server.send(400, "text/plain", "name required");
    return;
  }
  const String manu = server.arg("manufacturer");
  const String type = server.arg("type");
  const String colorHex = server.arg("color");  // "#RRGGBB"
  const uint16_t nominal = (uint16_t)server.arg("nominal").toInt();
  const uint16_t empty = (uint16_t)server.arg("empty").toInt();

  opentag::TagData data;
  strncpy(data.manufacturer, manu.c_str(), sizeof(data.manufacturer) - 1);
  strncpy(data.name, name.c_str(), sizeof(data.name) - 1);
  strncpy(data.type, type.c_str(), sizeof(data.type) - 1);
  data.nominalWeightGrams = nominal;
  data.emptyWeightGrams = empty;
  if (colorHex.length() >= 7 && colorHex[0] == '#') {
    data.rgb[0] = hexByte(colorHex, 1);
    data.rgb[1] = hexByte(colorHex, 3);
    data.rgb[2] = hexByte(colorHex, 5);
    data.hasColor = true;
  }

  if (!tag_write::request(data, name)) {
    server.send(409, "text/plain", "a tag write is already in progress");
    return;
  }
  Serial.printf("[tag] write requested: %s / %s\n", manu.c_str(), name.c_str());
  server.send(200, "application/json", "{\"status\":\"waiting\"}");
}

void handleWriteStatus() {
  server.send(200, "application/json",
              String("{\"status\":\"") + tag_write::statusText() + "\",\"reason\":\"" +
                  esc(tag_write::reason()) + "\"}");
}

void handleLog() { server.send(200, "text/plain", debuglog::dump()); }

void handleWriteCancel() {
  if (!checkCsrf()) return;
  tag_write::cancel();
  server.send(200, "application/json", "{\"status\":\"idle\"}");
}

void handleResetDisplay() {
  if (!checkCsrf()) return;
  if (g_resetDisplay) g_resetDisplay();
  redirectHome();
}

}  // namespace

void begin(Scale *scale, StatusFn onStatus, ResetDisplayFn onResetDisplay) {
  g_scale = scale;
  g_status = onStatus;
  g_resetDisplay = onResetDisplay;

  char buf[17];
  snprintf(buf, sizeof(buf), "%08x%08x", esp_random(), esp_random());
  g_csrf = buf;

  server.on("/", HTTP_GET, handleRoot);
  server.on("/weight", HTTP_GET, handleWeight);
  server.on("/tare", HTTP_POST, handleTare);
  server.on("/calibrate", HTTP_POST, handleCalibrate);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/write-tag", HTTP_POST, handleWriteTag);
  server.on("/write-status", HTTP_GET, handleWriteStatus);
  server.on("/write-cancel", HTTP_POST, handleWriteCancel);
  server.on("/log", HTTP_GET, handleLog);
  server.on("/reset-display", HTTP_POST, handleResetDisplay);
  server.on("/update", HTTP_POST, handleUpdateDone, handleUpdateUpload);
  server.begin();
  MDNS.addService("http", "tcp", 80);
}

void handle() { server.handleClient(); }

}  // namespace web_config
