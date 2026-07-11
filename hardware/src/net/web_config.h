#pragma once

class Scale;

// Always-on device config page (http://spoolhouse-scale.local/ or the device
// IP). Lets you set the Spoolhouse base URL + API token and calibrate/tare the
// scale from a browser. Unlike the WiFi setup portal, this runs during normal
// operation once WiFi is connected.
namespace web_config {

// Optional: called during a browser firmware upload so the caller can show
// progress/status on the display. line2 may be a byte/percent string.
using StatusFn = void (*)(const char *line1, const char *line2);

void begin(Scale *scale, StatusFn onStatus = nullptr);  // start HTTP server on port 80
void handle();                                          // call every loop iteration

}  // namespace web_config
