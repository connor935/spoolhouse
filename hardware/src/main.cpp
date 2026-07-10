// Spoolhouse scale — ESP32 Cheap Yellow Display
// Shows the current weight (zeroable with the tare button) and, when a spool's
// RFID tag is recognized, the decoded filament details. The NFC chip sits
// behind NfcReader and the tag formats behind SpoolDecoder, so new readers
// (CLRC663) and manufacturers (Creality, OpenTag) drop in without touching
// this file's logic.
#include <Arduino.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>

#include "config.h"
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
bool nfcOk = false;

// Tag / filament state
NfcUid currentUid;
bool tagPresent = false;
uint8_t tagMisses = 0;
FilamentInfo filament;  // decoded details for the current tag (valid flag inside)

// Tare input edge detection (BOOT button + touchscreen)
bool lastButtonDown = false;
uint32_t lastButtonChangeMs = 0;
uint32_t lastTouchTareMs = 0;

uint32_t lastNfcPollMs = 0;
uint32_t lastNfcInitMs = 0;
uint32_t lastDrawMs = 0;

// Cached last-drawn values so unchanged frames are skipped
String drawnWeight;
String drawnInfoKey;  // identity of what's in the detail area right now

// Layout (top → bottom): title, spool-info block, big weight, footer hint.
constexpr uint16_t INFO_Y = 26;    // top of the spool-info area
constexpr int WEIGHT_TOP = 150;    // spool info ends / weight zone begins
constexpr int WEIGHT_CY = 184;     // vertical centre of the weight readout

// Thin footer hint (not a button — the whole screen is the touch target)
constexpr int FOOTER_H = 16;
int footerY() { return tft.height() - FOOTER_H; }

void drawFooterHint() {
  tft.fillRect(0, footerY(), tft.width(), FOOTER_H, TFT_BLACK);
  tft.setTextDatum(BC_DATUM);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("tap screen to tare", tft.width() / 2, tft.height() - 1, 2);
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

void handleNewTag() {
  filament = FilamentInfo{};
  // MIFARE auth over the bit-banged SPI occasionally fails on first contact,
  // so give the decoders a few attempts before concluding "unknown".
  for (uint8_t attempt = 0; attempt < 3; attempt++) {
    if (spoolRegistry.identify(nfc, currentUid, filament)) {
      Serial.printf("[spool] %s / %s", filament.manufacturer, filament.material);
      if (filament.hasColor) Serial.printf(" %s", filament.color);
      if (filament.nominalWeightGrams) Serial.printf(" %ug", filament.nominalWeightGrams);
      if (filament.spoolId[0]) Serial.printf(" id=%s", filament.spoolId);
      Serial.println();
      return;
    }
    delay(40);
  }
  Serial.printf("[spool] tag %s not recognized\n", currentUid.toHexString().c_str());
}

void pollNfc() {
  NfcUid uid;
  if (nfc.readUid(uid, NFC_POLL_TIMEOUT_MS)) {
    tagMisses = 0;
    if (!tagPresent || uid != currentUid) {
      currentUid = uid;
      tagPresent = true;
      Serial.printf("[nfc] tag present: %s\n", currentUid.toHexString().c_str());
      handleNewTag();
    }
  } else if (tagPresent && ++tagMisses >= NFC_MISSES_UNTIL_GONE) {
    tagPresent = false;
    tagMisses = 0;
    filament = FilamentInfo{};
    Serial.println("[nfc] tag removed");
  }
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

void pollTareInputs() {
  const uint32_t now = millis();

  // Touchscreen: any touch tares
  if (touch.tirqTouched() && touch.touched()) {
    if (now - lastTouchTareMs >= TOUCH_DEBOUNCE_MS) {
      lastTouchTareMs = now;
      doTare("touch");
    }
  }

  // BOOT button backup (active-low)
  const bool down = digitalRead(PIN_TARE_BUTTON) == LOW;
  if (down != lastButtonDown && now - lastButtonChangeMs >= BUTTON_DEBOUNCE_MS) {
    lastButtonChangeMs = now;
    lastButtonDown = down;
    if (down) doTare("button");
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

  drawStaticUi();

  scaleOk = scale.begin(PIN_HX711_DT, PIN_HX711_SCK, HX711_COUNTS_PER_GRAM);
  Serial.printf("[scale] HX711 %s\n", scaleOk ? "ready, tared" : "NOT FOUND");

  spoolRegistry.add(&bambuDecoder);
  spoolRegistry.add(&crealityDecoder);
  spoolRegistry.add(&openTagDecoder);

  nfcOk = nfc.begin();
  Serial.printf("[nfc] %s %s\n", nfc.chipName(), nfcOk ? "ready" : "NOT FOUND");

  drawWeight();
  drawInfo();
}

void loop() {
  if (scaleOk) scale.update();
  pollTareInputs();

  const uint32_t now = millis();
  if (!nfcOk && now - lastNfcInitMs >= NFC_REINIT_INTERVAL_MS) {
    lastNfcInitMs = now;
    nfcOk = nfc.begin();
    if (nfcOk) Serial.printf("[nfc] %s ready\n", nfc.chipName());
  }
  if (nfcOk && now - lastNfcPollMs >= NFC_POLL_INTERVAL_MS) {
    lastNfcPollMs = now;
    pollNfc();
  }
  if (now - lastDrawMs >= DISPLAY_UPDATE_INTERVAL_MS) {
    lastDrawMs = now;
    drawWeight();
    drawInfo();
  }
}
