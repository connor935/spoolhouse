#include "web_config.h"

#include <ESPmDNS.h>
#include <WebServer.h>

#include "config_store.h"
#include "scale.h"

namespace web_config {
namespace {

WebServer server(80);
Scale *g_scale = nullptr;

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

String page() {
  const String url = config_store::serverUrl();
  const float cpg = g_scale ? g_scale->countsPerGram() : config_store::countsPerGram();
  const int grams = g_scale ? (int)lroundf(g_scale->grams()) : 0;

  String h;
  h.reserve(2600);
  h += F("<!doctype html><html><head><meta charset=utf-8>"
         "<meta name=viewport content='width=device-width,initial-scale=1'>"
         "<title>Spoolhouse scale</title><style>"
         "body{font-family:system-ui,sans-serif;max-width:32rem;margin:1.5rem auto;padding:0 1rem;"
         "background:#111;color:#eee}h1{font-size:1.3rem}h2{font-size:1rem;margin-top:1.6rem}"
         "input{width:100%;box-sizing:border-box;padding:.5rem;margin:.25rem 0 .75rem;border-radius:.4rem;"
         "border:1px solid #444;background:#1c1c1c;color:#eee}button{padding:.55rem 1rem;border:0;border-radius:.4rem;"
         "background:#2b6cb0;color:#fff;font-size:1rem;cursor:pointer}.w{font-size:2.2rem;font-weight:700}"
         "form{border:1px solid #333;border-radius:.6rem;padding:1rem;margin:.6rem 0}label{font-size:.85rem;color:#aaa}"
         "</style></head><body><h1>Spoolhouse scale</h1>");

  // Live weight + tare
  h += F("<form action=/tare method=post><h2>Weight</h2><div class=w id=w>");
  h += String(grams);
  h += F(" g</div><button type=submit>Tare (zero)</button></form>");

  // Calibration
  h += F("<form action=/calibrate method=post><h2>Calibrate</h2>"
         "<label>Tare empty, place a known weight, enter its grams, Calibrate.</label>"
         "<input name=known type=number step=1 placeholder='known weight (g), e.g. 500'>"
         "<label>counts/gram: ");
  h += String(cpg, 2);
  h += F("</label><button type=submit>Calibrate</button></form>");

  // Server config
  h += F("<form action=/save method=post><h2>Spoolhouse server</h2>"
         "<label>Base URL</label><input name=url value='");
  h += esc(url);
  h += F("'><label>API token (leave blank to keep current)</label>"
         "<input name=token type=password placeholder='sph_...'>"
         "<button type=submit>Save</button></form>");

  // Live weight updater
  h += F("<script>setInterval(function(){fetch('/weight').then(r=>r.text())"
         ".then(t=>{document.getElementById('w').textContent=t+' g'})},700)</script>");
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
  if (g_scale) g_scale->tare();
  redirectHome();
}

void handleCalibrate() {
  const float known = server.arg("known").toFloat();
  if (g_scale && known > 0.0f) {
    const float factor = g_scale->calibrate(known);
    config_store::setCountsPerGram(factor);
  }
  redirectHome();
}

void handleSave() {
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

}  // namespace

void begin(Scale *scale) {
  g_scale = scale;
  server.on("/", HTTP_GET, handleRoot);
  server.on("/weight", HTTP_GET, handleWeight);
  server.on("/tare", HTTP_POST, handleTare);
  server.on("/calibrate", HTTP_POST, handleCalibrate);
  server.on("/save", HTTP_POST, handleSave);
  server.begin();
  MDNS.addService("http", "tcp", 80);
}

void handle() { server.handleClient(); }

}  // namespace web_config
