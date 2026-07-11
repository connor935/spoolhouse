#pragma once

#include <Arduino.h>

// ---- HX711 load-cell amplifier (5 kg cell) ----
constexpr uint8_t PIN_HX711_DT = 22;
constexpr uint8_t PIN_HX711_SCK = 27;
// Raw HX711 counts per gram. Calibrate with a known weight: put e.g. 500 g on
// the scale and scale this factor by displayed/real grams. The sign depends on
// which way the load cell is mounted (A+/A- polarity) — negative here because
// this cell reads inverted with the positive factor.
constexpr float HX711_COUNTS_PER_GRAM = -420.0f;

// ---- NFC reader, SPI ----
// Driven as software SPI: the Adafruit PN532 driver is unreliable over ESP32
// hardware SPI with many clone modules, and bit-banging works on the same pins.
constexpr uint8_t PIN_NFC_SCK = 18;
constexpr uint8_t PIN_NFC_MISO = 19;
constexpr uint8_t PIN_NFC_MOSI = 23;
// PN532 SS is wired to IO5, the former SD-card CS (the SD holder is removed,
// so the pin is exclusively the NFC chip select).
constexpr uint8_t PIN_NFC_CS = 5;

// RGB LED channels (common anode, HIGH = off)
constexpr uint8_t PIN_LED_RED = 4;
constexpr uint8_t PIN_LED_GREEN = 16;
constexpr uint8_t PIN_LED_BLUE = 17;

// ---- Tare input ----
// Primary: the resistive touchscreen (any touch = tare). The XPT2046 sits on
// its own pins, wired to the free VSPI peripheral (the PN532 is bit-banged, so
// VSPI hardware is unused). Press detection needs no calibration.
constexpr uint8_t PIN_TOUCH_SCK = 25;
constexpr uint8_t PIN_TOUCH_CS = 33;
constexpr uint8_t PIN_TOUCH_MOSI = 32;
constexpr uint8_t PIN_TOUCH_MISO = 39;
constexpr uint8_t PIN_TOUCH_IRQ = 36;
// Backup: the on-board BOOT button (active-low), handy if touch ever misbehaves.
constexpr uint8_t PIN_TARE_BUTTON = 0;
constexpr uint32_t BUTTON_DEBOUNCE_MS = 40;
// Ignore repeat touches within this window so one press = one tare
constexpr uint32_t TOUCH_DEBOUNCE_MS = 400;

// ---- Spoolhouse REST upload ----
// Assumed empty-spool weight (g) sent when registering a new spool (the tag
// doesn't carry it); edit the spool type later in the webapp for accuracy.
constexpr int DEFAULT_EMPTY_SPOOL_G = 250;
// Tap-to-upload measurement: sample the weight for this long, then average the
// middle band (trimming outliers) before uploading.
constexpr uint32_t UPLOAD_MEASURE_MS = 5000;

// ---- WiFi setup portal ----
// SoftAP name shown when the device can't reach WiFi and opens the setup portal.
constexpr const char *PORTAL_AP_NAME = "Spoolhouse-Setup";

// ---- Factory reset (hold the touchscreen) ----
constexpr uint32_t RESET_WARN1_MS = 10000;    // first warning
constexpr uint32_t RESET_WARN2_MS = 15000;    // second warning
constexpr uint32_t RESET_TRIGGER_MS = 20000;  // show the reset confirmation screen
constexpr uint32_t TAP_MAX_MS = 1200;         // a touch shorter than this is a tap (tare/upload)

// XPT2046 raw->pixel calibration (typical CYD values) for hit-testing the
// reset-screen buttons. Tune if a button press lands in the wrong region.
constexpr int TOUCH_RAW_X_MIN = 200;
constexpr int TOUCH_RAW_X_MAX = 3700;
constexpr int TOUCH_RAW_Y_MIN = 240;
constexpr int TOUCH_RAW_Y_MAX = 3800;

// ---- Polling / display timing ----
constexpr uint32_t NFC_POLL_INTERVAL_MS = 250;
constexpr uint16_t NFC_POLL_TIMEOUT_MS = 50;
// A tag counts as removed after this many consecutive failed polls. Kept
// generous so brief read glitches (e.g. WiFi activity during an upload
// disturbing the bit-banged bus) don't spuriously drop a present tag.
constexpr uint8_t NFC_MISSES_UNTIL_GONE = 6;
// While the reader is offline, retry initializing it this often
constexpr uint32_t NFC_REINIT_INTERVAL_MS = 5000;
constexpr uint32_t DISPLAY_UPDATE_INTERVAL_MS = 200;
// Exponential smoothing for the weight readout (0..1, higher = snappier)
constexpr float WEIGHT_EMA_ALPHA = 0.3f;
