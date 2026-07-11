#pragma once

class Scale;

// Always-on device config page (http://spoolhouse-scale.local/ or the device
// IP). Lets you set the Spoolhouse base URL + API token and calibrate/tare the
// scale from a browser. Unlike the WiFi setup portal, this runs during normal
// operation once WiFi is connected.
namespace web_config {

void begin(Scale *scale);  // start the HTTP server on port 80
void handle();             // call every loop iteration

}  // namespace web_config
