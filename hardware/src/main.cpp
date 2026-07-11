// Spoolhouse scale — ESP32 Cheap Yellow Display
// Shows the current weight (zeroable with the tare button) and, when a spool's
// RFID tag is recognized, the decoded filament details. The NFC chip sits
// behind NfcReader and the tag formats behind SpoolDecoder, so new readers
// (CLRC663) and manufacturers (Creality, OpenTag) drop in without touching
// this file's logic.
#include <algorithm>

#include <Arduino.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>

#include "config.h"
#include "config_store.h"
#include "net/spoolhouse_client.h"
#include "nfc/nfc_reader.h"
#include "nfc/pn532_reader.h"
#include "scale.h"
#include "spool/bambu_decoder.h"
#include "spool/creality_decoder.h"
#include "spool/filament_info.h"
#include "spool/opentag_decoder.h"
#include "spool/spool_registry.h"

namespace {

TFT_eSPI tft;
Scale scale;
Pn532Reader pn532Reader(PIN_NFC_SCK, PIN_NFC_MISO, PIN_NFC_MOSI, PIN_NFC_CS);
// The one place that decides which NFC chip is in use
NfcReader &nfc = pn532Reader;

// Resistive touch on its own pins, driven by the (otherwise free) VSPI bus
SPIClass touchSpi(VSPI);
XPT2046_Touchscreen touch(PIN_TOUCH_CS, PIN_TOUCH_IRQ);

// Manufacturer tag decoders, tried in registration order
BambuDecoder bambuDecoder;
CrealityDecoder crealityDecoder;
OpenTagDecoder openTagDecoder;
SpoolRegistry spoolRegistry;

bool scaleOk = false;

// NFC (reader + decode) runs on core 0 because the bit-banged SPI polling and
// the multi-block MIFARE decode are slow and would otherwise stutter the
// display/scale loop on core 1. The task publishes results here under a mutex;
// the main loop copies them into the `filament`/`tagPresent`/… locals below.
SemaphoreHandle_t nfcMutex;
bool pubNfcOk = false;
bool pubTagPresent = false;
NfcUid pubUid;
FilamentInfo pubFilament;

// Main-loop snapshot of the NFC state (refreshed each loop by syncNfcState).
bool nfcOk = false;
NfcUid currentUid;
bool tagPresent = false;
FilamentInfo filament;  // decoded details for the current tag (valid flag inside)

// Tap input edge detection (BOOT button + touchscreen)
bool lastButtonDown = false;
uint32_t lastButtonChangeMs = 0;
uint32_t lastTouchMs = 0;

// Touch-hold tracking (short tap vs long hold-to-factory-reset)
bool touchHeld = false;
uint32_t touchDownMs = 0;
int resetCountdownSec = -1;  // last countdown value drawn during a hold (-1 = idle)

uint32_t lastDrawMs = 0;

// Cached last-drawn values so unchanged frames are skipped
String drawnWeight;
String drawnInfoKey;  // identity of what's in the detail area right now

// Layout (top → bottom): title, spool-info block, big weight, footer hint.
constexpr uint16_t INFO_Y = 26;    // top of the spool-info area
constexpr int WEIGHT_TOP = 150;    // spool info ends / weight zone begins
constexpr int WEIGHT_CY = 184;     // vertical centre of the weight readout

// Thin footer hint (not a button — the whole screen is the touch target).
// The action depends on context: upload when a spool is recognized, else tare.
constexpr int FOOTER_H = 16;
int footerY() { return tft.height() - FOOTER_H; }

bool canUpload() { return tagPresent && filament.valid; }

void drawFooterHint() {
  tft.fillRect(0, footerY(), tft.width(), FOOTER_H, TFT_BLACK);
  tft.setTextDatum(BC_DATUM);
  tft.setTextColor(canUpload() ? TFT_SKYBLUE : TFT_DARKGREY, TFT_BLACK);
  tft.drawString(canUpload() ? "tap screen to upload" : "tap screen to tare",
                 tft.width() / 2, tft.height() - 1, 2);
}

void drawStaticUi() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(TC_DATUM);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("SPOOLHOUSE SCALE", tft.width() / 2, 6, 2);
  drawFooterHint();
}

void drawWeight() {
  const String num = scaleOk ? String((int)lroundf(scale.grams())) : String("no scale");
  if (num == drawnWeight) return;
  drawnWeight = num;

  tft.fillRect(0, WEIGHT_TOP, tft.width(), footerY() - WEIGHT_TOP, TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  if (!scaleOk) {
    tft.setTextDatum(MC_DATUM);
    tft.drawString("no scale", tft.width() / 2, WEIGHT_CY, 4);
    return;
  }
  // Font 6 (big) has digits only, so draw the "g" unit in font 4 beside it.
  const int cx = tft.width() / 2;
  tft.setTextDatum(MR_DATUM);
  tft.drawString(num, cx + 16, WEIGHT_CY, 6);
  tft.setTextDatum(ML_DATUM);
  tft.drawString("g", cx + 24, WEIGHT_CY, 4);
}

// A short identity string for the detail area, so we only repaint on change.
String infoKey() {
  if (!nfcOk) return "offline";
  if (!tagPresent) return "none";
  if (filament.valid) return "F:" + String(filament.material) + currentUid.toHexString();
  return "U:" + currentUid.toHexString();
}

void drawInfo() {
  const String key = infoKey();
  if (key == drawnInfoKey) return;
  drawnInfoKey = key;
  drawFooterHint();  // action (tare/upload) depends on spool presence

  // Clear the spool-info area (above the weight zone)
  tft.fillRect(0, INFO_Y, tft.width(), WEIGHT_TOP - INFO_Y - 2, TFT_BLACK);
  const int cx = tft.width() / 2;

  if (!nfcOk) {
    tft.setTextDatum(TC_DATUM);
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.drawString("NFC reader offline", cx, INFO_Y + 20, 4);
    return;
  }
  if (!tagPresent) {
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.drawString("Place a spool", cx, (INFO_Y + WEIGHT_TOP) / 2, 4);
    return;
  }
  if (!filament.valid) {
    // Unrecognized tag — show the raw UID
    tft.setTextDatum(TC_DATUM);
    tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    tft.drawString("Unknown tag", cx, INFO_Y, 2);
    tft.drawString(currentUid.toHexString(), cx, INFO_Y + 22, 4);
    return;
  }

  // Recognized filament — left-aligned detail block
  const int lx = 14;
  tft.setTextDatum(TL_DATUM);
  tft.setTextColor(TFT_SKYBLUE, TFT_BLACK);
  tft.drawString(filament.manufacturer, lx, INFO_Y, 2);
  if (filament.sku[0]) {
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.drawString(filament.sku, tft.width() - lx, INFO_Y, 2);
    tft.setTextDatum(TL_DATUM);
  }
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString(filament.material, lx, INFO_Y + 16, 4);

  int y = INFO_Y + 46;
  int textX = lx;
  if (filament.hasColor) {
    const int sw = 20;
    tft.fillRect(lx, y, sw, sw, filament.swatchColor565());
    tft.drawRect(lx, y, sw, sw, TFT_DARKGREY);
    textX = lx + sw + 8;
  }
  String specs;
  if (filament.nominalWeightGrams) specs += String(filament.nominalWeightGrams) + " g";
  if (filament.diameterMm > 0.1f) specs += (specs.length() ? "  " : "") + String(filament.diameterMm, 2) + " mm";
  if (filament.lengthMeters) specs += (specs.length() ? "  " : "") + String(filament.lengthMeters) + " m";
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString(specs, textX, y + 3, 4);
  y += 28;

  if (filament.spoolId[0]) {
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.drawString("ID " + String(filament.spoolId), lx, y, 2);
    y += 15;
  }
  String line2;
  if (filament.productionDate[0]) line2 += String(filament.productionDate);
  if (filament.spoolWidthMm > 0.1f)
    line2 += (line2.length() ? "  " : "") + String(filament.spoolWidthMm, 0) + "mm wide";
  if (line2.length()) {
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.drawString(line2, lx, y, 2);
  }
}

void drawWifiStatus() {
  const bool up = spoolhouse::wifiConnected();
  tft.fillRect(tft.width() - 60, 4, 60, 14, TFT_BLACK);
  tft.setTextDatum(TR_DATUM);
  tft.setTextColor(up ? TFT_GREEN : TFT_DARKGREY, TFT_BLACK);
  tft.drawString(up ? "wifi" : "no wifi", tft.width() - 6, 5, 2);
}

// Publish the NFC task's current state for the main loop to read.
void publishNfc(bool ok, bool present, const NfcUid &uid, const FilamentInfo &fil) {
  xSemaphoreTake(nfcMutex, portMAX_DELAY);
  pubNfcOk = ok;
  pubTagPresent = present;
  pubUid = uid;
  pubFilament = fil;
  xSemaphoreGive(nfcMutex);
}

// Copy the published NFC state into the main-loop locals (called from loop()).
void syncNfcState() {
  xSemaphoreTake(nfcMutex, portMAX_DELAY);
  nfcOk = pubNfcOk;
  tagPresent = pubTagPresent;
  currentUid = pubUid;
  filament = pubFilament;
  xSemaphoreGive(nfcMutex);
}

// Decode a freshly-detected tag (retries: MIFARE auth over bit-banged SPI can
// miss on first contact). Fills `fil`.
void decodeTag(const NfcUid &uid, FilamentInfo &fil) {
  fil = FilamentInfo{};
  for (uint8_t attempt = 0; attempt < 3; attempt++) {
    if (spoolRegistry.identify(nfc, uid, fil)) {
      Serial.printf("[spool] %s / %s", fil.manufacturer, fil.material);
      if (fil.hasColor) Serial.printf(" %s", fil.color);
      if (fil.nominalWeightGrams) Serial.printf(" %ug", fil.nominalWeightGrams);
      if (fil.spoolId[0]) Serial.printf(" id=%s", fil.spoolId);
      Serial.println();
      return;
    }
    delay(40);
  }
  Serial.printf("[spool] tag %s not recognized\n", uid.toHexString().c_str());
}

// Core-0 task: owns the NFC reader entirely (init, poll, decode) so its slow
// blocking work never stalls the display/scale loop on core 1.
void nfcTask(void *) {
  bool ok = nfc.begin();
  Serial.printf("[nfc] %s %s (core %d)\n", nfc.chipName(), ok ? "ready" : "NOT FOUND", xPortGetCoreID());

  NfcUid uid;
  bool present = false;
  uint8_t misses = 0;
  FilamentInfo fil;
  // Cache of the last VALID decode, so a returning known tag shows instantly
  // (no slow re-decode, no "unknown" flash) — e.g. after an upload.
  NfcUid cacheUid;
  FilamentInfo cacheFil;
  publishNfc(ok, false, uid, fil);
  uint32_t lastInit = millis();

  for (;;) {
    if (!ok) {
      if (millis() - lastInit >= NFC_REINIT_INTERVAL_MS) {
        lastInit = millis();
        ok = nfc.begin();
        if (ok) Serial.printf("[nfc] %s ready\n", nfc.chipName());
        publishNfc(ok, present, uid, fil);
      }
      vTaskDelay(pdMS_TO_TICKS(200));
      continue;
    }

    NfcUid u;
    if (nfc.readUid(u, NFC_POLL_TIMEOUT_MS)) {
      misses = 0;
      if (!present || u != uid) {
        uid = u;
        present = true;
        if (u == cacheUid && cacheFil.valid) {
          fil = cacheFil;  // known tag → restore instantly
          Serial.printf("[nfc] tag present (cached): %s\n", uid.toHexString().c_str());
        } else {
          Serial.printf("[nfc] tag present: %s\n", uid.toHexString().c_str());
          decodeTag(uid, fil);
          if (fil.valid) {
            cacheUid = uid;
            cacheFil = fil;
          }
        }
        publishNfc(ok, present, uid, fil);
      }
    } else if (present && ++misses >= NFC_MISSES_UNTIL_GONE) {
      present = false;
      misses = 0;
      fil = FilamentInfo{};
      Serial.println("[nfc] tag removed");
      publishNfc(ok, present, uid, fil);
    }
    vTaskDelay(pdMS_TO_TICKS(NFC_POLL_INTERVAL_MS));
  }
}

// Full-screen centred message (measuring / uploading / result overlay).
void overlayMessage(const String &l1, const String &l2, uint16_t color) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(color, TFT_BLACK);
  tft.drawString(l1, tft.width() / 2, tft.height() / 2 - 18, 4);
  if (l2.length()) {
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.drawString(l2, tft.width() / 2, tft.height() / 2 + 16, 4);
  }
}

// Repaint the normal UI after an overlay.
void restoreUi() {
  drawnWeight = "";
  drawnInfoKey = "";
  drawStaticUi();
  drawWifiStatus();
  drawWeight();
  drawInfo();
}

// Measure the weight for 5 s, average the middle 5–95 % of the sorted samples
// (rejecting outliers), and upload the result to Spoolhouse.
void doUpload() {
  overlayMessage("Measuring...", "hold still", TFT_SKYBLUE);

  constexpr int CAP = 160;
  static float samples[CAP];
  int n = 0;
  const uint32_t start = millis();
  while (millis() - start < UPLOAD_MEASURE_MS && n < CAP) {
    samples[n++] = scale.readInstant();
  }
  if (n < 3) {
    overlayMessage("No reading", "", TFT_RED);
    delay(1500);
    restoreUi();
    return;
  }

  std::sort(samples, samples + n);
  // Trim the lowest 5 % and highest 5 %, average the rest.
  int lo = (int)floorf(0.05f * n);
  int hi = (int)ceilf(0.95f * n);
  if (hi <= lo) {
    lo = 0;
    hi = n;
  }
  double sum = 0;
  for (int i = lo; i < hi; i++) sum += samples[i];
  const int avg = (int)lroundf(sum / (hi - lo));
  Serial.printf("[upload] %d samples, trimmed avg %d g (used %d)\n", n, avg, hi - lo);

  overlayMessage("Uploading...", String(avg) + " g", TFT_YELLOW);
  String action;
  const auto r = spoolhouse::postWeigh(filament, avg, &action);
  if (r == spoolhouse::Result::Ok) {
    overlayMessage("Uploaded!", String(avg) + " g", TFT_GREENYELLOW);
    delay(2000);
  } else {
    overlayMessage("Upload failed", r == spoolhouse::Result::NoWifi ? "no wifi" : "server error", TFT_RED);
    delay(2000);
  }
  restoreUi();
}

void doTare(const char *source) {
  if (!scaleOk) return;
  scale.tare();
  drawnWeight = "";  // force weight repaint (snaps to ~0 g)
  Serial.printf("[scale] tared (%s)\n", source);
  // Brief confirmation toast in the footer, then restore the hint
  tft.fillRect(0, footerY(), tft.width(), FOOTER_H, TFT_BLACK);
  tft.setTextDatum(BC_DATUM);
  tft.setTextColor(TFT_GREENYELLOW, TFT_BLACK);
  tft.drawString("tared", tft.width() / 2, tft.height() - 1, 2);
  delay(150);
  drawFooterHint();
}

// Tap = upload when a recognized spool is present, otherwise tare.
void onTap(const char *source) {
  if (canUpload()) {
    doUpload();
  } else {
    doTare(source);
  }
}

// WiFi setup-portal screen (shown while the AP is open).
void drawSetupScreen(const char *apName) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(TC_DATUM);
  tft.setTextColor(TFT_SKYBLUE, TFT_BLACK);
  tft.drawString("WiFi setup", tft.width() / 2, 16, 4);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("1. Join WiFi network:", tft.width() / 2, 64, 2);
  tft.drawString(apName, tft.width() / 2, 84, 4);
  tft.drawString("2. Open in a browser:", tft.width() / 2, 126, 2);
  tft.drawString("192.168.4.1", tft.width() / 2, 146, 4);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("pick network, password & API token", tft.width() / 2, 200, 2);
}

// Map a raw XPT2046 point to screen pixels (rough; for reset-button hit-tests).
int touchToX(int rawX) {
  long v = map(rawX, TOUCH_RAW_X_MIN, TOUCH_RAW_X_MAX, 0, tft.width());
  return constrain((int)v, 0, tft.width() - 1);
}
int touchToY(int rawY) {
  long v = map(rawY, TOUCH_RAW_Y_MIN, TOUCH_RAW_Y_MAX, 0, tft.height());
  return constrain((int)v, 0, tft.height() - 1);
}

// Reset-screen button rectangles (x, y, w, h).
struct Rect {
  int x, y, w, h;
  bool contains(int px, int py) const { return px >= x && px < x + w && py >= y && py < y + h; }
};
const Rect BTN_BACK = {14, 172, 140, 56};
const Rect BTN_RESET = {166, 172, 140, 56};

// Update the hold-to-reset warning/countdown overlay (redrawn once per second).
void updateResetCountdown(uint32_t heldMs) {
  const int remain = (int)((RESET_TRIGGER_MS - heldMs + 999) / 1000);
  if (remain == resetCountdownSec) return;
  resetCountdownSec = remain;
  const uint16_t color = heldMs >= RESET_WARN2_MS ? TFT_RED : TFT_ORANGE;
  overlayMessage("Factory reset in " + String(remain) + "s", "release to cancel", color);
}

// Shown after a 20 s hold: two buttons. The finger that held for 20 s must be
// lifted first, then the reset button pressed deliberately — a tap anywhere
// else (or 20 s of inaction) cancels, so a mis-tap is always safe.
void factoryResetScreen() {
  resetCountdownSec = -1;
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(TC_DATUM);
  tft.setTextColor(TFT_RED, TFT_BLACK);
  tft.drawString("Factory reset", tft.width() / 2, 22, 4);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.drawString("Erase WiFi & API token?", tft.width() / 2, 66, 2);
  tft.drawString("Release, then choose:", tft.width() / 2, 92, 2);

  tft.fillRoundRect(BTN_BACK.x, BTN_BACK.y, BTN_BACK.w, BTN_BACK.h, 8, TFT_DARKGREEN);
  tft.fillRoundRect(BTN_RESET.x, BTN_RESET.y, BTN_RESET.w, BTN_RESET.h, 8, TFT_RED);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE);
  tft.drawString("Go back", BTN_BACK.x + BTN_BACK.w / 2, BTN_BACK.y + BTN_BACK.h / 2, 4);
  tft.drawString("RESET", BTN_RESET.x + BTN_RESET.w / 2, BTN_RESET.y + BTN_RESET.h / 2, 4);

  // Require the held finger to lift before any press counts.
  while (touch.touched()) delay(20);
  delay(150);

  const uint32_t start = millis();
  while (millis() - start < 20000) {  // decide within 20 s, else cancel
    if (touch.touched()) {
      const TS_Point p = touch.getPoint();
      const int sx = touchToX(p.x), sy = touchToY(p.y);
      if (BTN_RESET.contains(sx, sy)) {
        overlayMessage("Resetting...", "", TFT_RED);
        spoolhouse::factoryReset();
        ESP.restart();
      }
      break;  // go-back button or anywhere else → cancel (safe)
    }
    delay(20);
  }
  restoreUi();
}

void pollInputs() {
  const uint32_t now = millis();
  const bool down = touch.touched();  // continuous pressure detection

  if (down && !touchHeld) {
    touchHeld = true;
    touchDownMs = now;
    resetCountdownSec = -1;
  } else if (down && touchHeld) {
    const uint32_t dur = now - touchDownMs;
    if (dur >= RESET_TRIGGER_MS) {
      touchHeld = false;
      factoryResetScreen();
      return;
    }
    if (dur >= RESET_WARN1_MS) updateResetCountdown(dur);  // 10 s+: warn + count down
  } else if (!down && touchHeld) {
    const uint32_t dur = now - touchDownMs;
    touchHeld = false;
    if (resetCountdownSec >= 0) {
      resetCountdownSec = -1;
      restoreUi();  // warning was showing → cancelled
    } else if (dur <= TAP_MAX_MS) {
      onTap("touch");  // short tap → tare/upload
    }
  }

  // BOOT button backup (active-low): simple tap
  const bool bdown = digitalRead(PIN_TARE_BUTTON) == LOW;
  if (bdown != lastButtonDown && now - lastButtonChangeMs >= BUTTON_DEBOUNCE_MS) {
    lastButtonChangeMs = now;
    lastButtonDown = bdown;
    if (bdown) onTap("button");
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);

  pinMode(PIN_TARE_BUTTON, INPUT_PULLUP);
  // RGB LED off (common anode)
  pinMode(PIN_LED_RED, OUTPUT);
  digitalWrite(PIN_LED_RED, HIGH);
  pinMode(PIN_LED_GREEN, OUTPUT);
  digitalWrite(PIN_LED_GREEN, HIGH);
  pinMode(PIN_LED_BLUE, OUTPUT);
  digitalWrite(PIN_LED_BLUE, HIGH);

  tft.init();
  tft.setRotation(1);       // landscape, USB to the right
  tft.invertDisplay(true);  // this CYD panel powers up inverted; correct it

  // CYD gamma fix (witnessmenow's CYD guide, "the display doesn't look as
  // good"): selecting a different gamma curve cures washed-out colours.
  tft.writecommand(0x26);  // ILI9341_GAMMASET
  tft.writedata(2);
  delay(120);
  tft.writecommand(0x26);
  tft.writedata(1);

  touchSpi.begin(PIN_TOUCH_SCK, PIN_TOUCH_MISO, PIN_TOUCH_MOSI, PIN_TOUCH_CS);
  touch.begin(touchSpi);
  touch.setRotation(1);

  scaleOk = scale.begin(PIN_HX711_DT, PIN_HX711_SCK, HX711_COUNTS_PER_GRAM);
  Serial.printf("[scale] HX711 %s\n", scaleOk ? "ready, tared" : "NOT FOUND");

  spoolRegistry.add(&bambuDecoder);
  spoolRegistry.add(&crealityDecoder);
  spoolRegistry.add(&openTagDecoder);

  // Connect to WiFi, or open the setup AP portal (shows drawSetupScreen). This
  // blocks until connected; the portal reboots the device once provisioned.
  spoolhouse::provision(drawSetupScreen);

  drawStaticUi();
  drawWifiStatus();

  // Run the NFC reader/decoder on core 0 so it never stutters the UI (the
  // Arduino loop runs on core 1). Results are shared via nfcMutex.
  nfcMutex = xSemaphoreCreateMutex();
  xTaskCreatePinnedToCore(nfcTask, "nfc", 8192, nullptr, 1, nullptr, 0);

  drawWeight();
  drawInfo();
}

void loop() {
  syncNfcState();  // pick up the latest NFC result from core 0
  if (scaleOk) scale.update();
  pollInputs();

  const uint32_t now = millis();
  // Don't repaint the normal UI while a factory-reset warning/countdown overlay
  // is showing (resetCountdownSec >= 0) — otherwise the weight reading pops
  // through over it.
  if (resetCountdownSec < 0 && now - lastDrawMs >= DISPLAY_UPDATE_INTERVAL_MS) {
    lastDrawMs = now;
    drawWeight();
    drawInfo();
    drawWifiStatus();
  }
  delay(5);  // yield to the idle task (NFC no longer blocks this loop)
}
