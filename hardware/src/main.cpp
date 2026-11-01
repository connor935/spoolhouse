// Spoolhouse scale — ESP32 Cheap Yellow Display
// Shows the current weight (zeroable with the tare button) and, when a spool's
// RFID tag is recognized, the decoded filament details. The NFC chip sits
// behind NfcReader and the tag formats behind SpoolDecoder, so new readers
// and manufacturers (Creality, OpenTag) drop in without touching this file's
// logic.
#include <algorithm>

#include <Arduino.h>
#include <ArduinoOTA.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <WiFi.h>
#include <XPT2046_Touchscreen.h>

#include "config.h"
#include "config_store.h"
#include "debuglog.h"
#include "net/spoolhouse_client.h"
#include "net/web_config.h"
#include "secrets.h"  // OTA_PASSWORD
#include "nfc/clrc663_reader.h"
#include "nfc/nfc_reader.h"
#include "scale.h"
#include "spool/bambu_decoder.h"
#include "spool/creality_decoder.h"
#include "spool/filament_info.h"
#include "spool/opentag_decoder.h"
#include "spool/spool_registry.h"
#include "tag_write.h"

namespace {

TFT_eSPI tft;
Scale scale;
Clrc663Reader clrc663Reader(PIN_NFC_SCK, PIN_NFC_MISO, PIN_NFC_MOSI, PIN_NFC_CS);
// The one place that decides which NFC chip is in use
NfcReader &nfc = clrc663Reader;

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

// True while the NFC task (core 0) is actively driving its bit-banged bus /
// energising the reader. The display loop (core 1) reads this and defers its
// repaint so a TFT SPI write never overlaps an NFC read — that overlap, on a
// marginal 5 V supply, is what glitches the reset-less ILI9341 to white during
// tag reads. A hint, not a lock: a single bool is torn-read-safe here.
volatile bool nfcBusBusy = false;

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

// Needs a working scale (otherwise readInstant() yields a stale 0 g that would
// overwrite the spool's weight) and a per-spool id to send as tagUid — a Bambu
// tag whose tray-UID block failed to read has none; lifting and re-placing the
// spool re-reads it.
bool canUpload() { return scaleOk && tagPresent && filament.valid && filament.spoolId[0]; }

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

// The weight zone is composed off-screen and pushed in one blit: fillRect +
// redraw directly on the panel flashes a big black band on every 1 g wobble
// (up to 5x/s), which reads as whole-screen flicker.
TFT_eSprite weightSprite(&tft);

void drawWeight() {
  const String num = scaleOk ? String((int)lroundf(scale.grams())) : String("no scale");
  if (num == drawnWeight) return;
  drawnWeight = num;

  const int zoneH = footerY() - WEIGHT_TOP;
  if (!weightSprite.created()) {
    if (weightSprite.createSprite(tft.width(), zoneH) == nullptr) {
      // No heap for the sprite — draw directly (flashes, but works)
      tft.fillRect(0, WEIGHT_TOP, tft.width(), zoneH, TFT_BLACK);
      tft.setTextColor(TFT_WHITE, TFT_BLACK);
      tft.setTextDatum(MC_DATUM);
      tft.drawString(num + (scaleOk ? " g" : ""), tft.width() / 2, WEIGHT_CY, 4);
      return;
    }
  }

  weightSprite.fillSprite(TFT_BLACK);
  weightSprite.setTextColor(TFT_WHITE, TFT_BLACK);
  const int cy = WEIGHT_CY - WEIGHT_TOP;  // sprite-local centre line
  if (!scaleOk) {
    weightSprite.setTextDatum(MC_DATUM);
    weightSprite.drawString("no scale", tft.width() / 2, cy, 4);
  } else {
    // Font 6 (big) has digits only, so draw the "g" unit in font 4 beside it.
    const int cx = tft.width() / 2;
    weightSprite.setTextDatum(MR_DATUM);
    weightSprite.drawString(num, cx + 16, cy, 6);
    weightSprite.setTextDatum(ML_DATUM);
    weightSprite.drawString("g", cx + 24, cy, 4);
  }
  weightSprite.pushSprite(0, WEIGHT_TOP);
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

int drawnWifi = -1;  // last drawn state (-1 = force repaint)

void drawWifiStatus() {
  const bool up = spoolhouse::wifiConnected();
  if ((int)up == drawnWifi) return;  // repainting every frame flickers the label
  drawnWifi = (int)up;
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
      debuglog::add("read " + String(fil.manufacturer) + " / " + String(fil.material) +
                    " (" + String(fil.filamentType) + ")");
      return;
    }
    delay(40);
  }
  debuglog::add("read UNKNOWN uid=" + uid.toHexString());
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
  uint32_t writeWaitStart = 0;

  for (;;) {
    nfcBusBusy = true;  // reader/bus work follows; cleared before we idle below
    if (!ok) {
      if (millis() - lastInit >= NFC_REINIT_INTERVAL_MS) {
        lastInit = millis();
        ok = nfc.begin();
        if (ok) Serial.printf("[nfc] %s ready\n", nfc.chipName());
        publishNfc(ok, present, uid, fil);
      }
      nfcBusBusy = false;
      vTaskDelay(pdMS_TO_TICKS(200));
      continue;
    }

    // A tag-write was queued from the config page: instead of decoding, wait
    // for a tag to be presented and write the Spoolhouse format onto it.
    const tag_write::Status ws = tag_write::status();
    if (ws == tag_write::Status::Waiting || ws == tag_write::Status::Writing) {
      if (writeWaitStart == 0) writeWaitStart = millis();
      if (millis() - writeWaitStart > TAG_WRITE_TIMEOUT_MS) {
        tag_write::setStatus(tag_write::Status::Idle);  // gave up waiting
        writeWaitStart = 0;
      } else {
        NfcUid wu;
        if (nfc.readUid(wu, NFC_POLL_TIMEOUT_MS)) {
          tag_write::setStatus(tag_write::Status::Writing);
          opentag::TagData td;
          tag_write::copyData(td);
          debuglog::add("write data: " + String(td.manufacturer) + " / " + String(td.name) +
                        " (" + String(td.type) + ") nom=" + td.nominalWeightGrams + "g empty=" +
                        td.emptyWeightGrams + "g");
          // Size the OpenTag3D record to the tag: read its capability container
          // (page 3, byte 2 ×8 = user bytes) so big tags get the full record.
          uint8_t cc[4] = {0};
          uint16_t capacity = 144;
          if (nfc.readNtagPages(wu, 3, 1, cc) && cc[2]) capacity = (uint16_t)cc[2] * 8;
          uint8_t img[opentag::MAX_IMAGE];
          const size_t len = opentag::buildImage(td, capacity, img);
          bool wrote = false;
          if (len > 0) {
            wrote = nfc.writeNtagPages(wu, opentag::START_PAGE, (uint8_t)(len / 4), img);
          }
          if (wrote) {
            tag_write::setStatus(tag_write::Status::Done);
            debuglog::add("write ok uid=" + wu.toHexString() + " len=" + len + " cap=" + capacity);
            if (td.emptyWeightGrams > 0 && capacity < 204) {
              // OpenTag3D stores the empty weight at byte 0xAC, beyond an
              // NTAG213's 144 bytes — it is silently absent on small tags.
              debuglog::add("note: empty weight NOT on tag (needs NTAG215/216)");
            }
          } else {
            // Figure out why. A blank MIFARE Classic answers auth with the
            // default key but rejects NTAG writes — the most common mistake.
            String why = len == 0 ? "tag too small - use NTAG215" : "write failed";
            const uint8_t defKey[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
            uint8_t blk[16];
            if (nfc.supportsMifareClassic() && nfc.mifareReadBlock(wu, 4, MIFARE_KEY_A, defKey, blk)) {
              why = "MIFARE Classic tag - use a blank NTAG213/215";
            }
            tag_write::fail(why);
            debuglog::add("write FAILED uid=" + wu.toHexString() + " (" + why + ")");
          }
          writeWaitStart = 0;
          present = false;  // force a fresh read/decode of the just-written tag
          misses = 0;
          // The tag's content just changed (even a failed write may have
          // altered pages) — drop the cached decode or the display would keep
          // showing the pre-write data after the re-detect.
          cacheUid = NfcUid{};
          cacheFil = FilamentInfo{};
        }
      }
      nfcBusBusy = false;
      vTaskDelay(pdMS_TO_TICKS(NFC_POLL_INTERVAL_MS));
      continue;
    }
    writeWaitStart = 0;

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
    nfcBusBusy = false;
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
  drawnWifi = -1;
  drawStaticUi();
  drawWifiStatus();
  drawWeight();
  drawInfo();
}

// Bring up the TFT: init + rotation + inversion + the CYD gamma tweak. Called
// at boot and again if the panel is re-initialised from the config page.
void initDisplay() {
  tft.init();
  tft.setRotation(1);       // landscape, USB to the right
  tft.invertDisplay(true);  // this CYD panel powers up inverted; correct it
  // CYD gamma fix (witnessmenow's CYD guide): a different gamma curve cures
  // washed-out colours.
  tft.writecommand(0x26);  // ILI9341_GAMMASET
  tft.writedata(2);
  delay(120);
  tft.writecommand(0x26);
  tft.writedata(1);
}

// Re-initialise the panel (config-page "Reset display"): the ILI9341 has no
// wired reset line, so a power/SPI glitch can leave it white while the ESP32
// keeps running — this recovers it without a reboot.
void resetDisplay() {
  Serial.println("[display] re-init requested");
  initDisplay();
  restoreUi();
}

// Show the tag-write flow as a full-screen overlay (the write itself runs on
// the NFC task, core 0). Returns true while an overlay is up, so the normal UI
// and tap handling are suppressed. Auto-clears a few seconds after done/failed.
int writeShownState = -1;  // last tag_write::Status drawn (-1 = none)
uint32_t writeSettledAt = 0;

bool serviceTagWrite() {
  const tag_write::Status s = tag_write::status();
  if (s == tag_write::Status::Idle) {
    if (writeShownState != -1) {  // just finished/cancelled → repaint normal UI
      writeShownState = -1;
      restoreUi();
    }
    return false;
  }
  if ((int)s != writeShownState) {
    writeShownState = (int)s;
    switch (s) {
      case tag_write::Status::Waiting:
        overlayMessage("Hold blank tag", "to the reader", TFT_SKYBLUE);
        tft.setTextDatum(BC_DATUM);
        tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
        tft.drawString("writing: " + tag_write::label(), tft.width() / 2, tft.height() - 6, 2);
        break;
      case tag_write::Status::Writing:
        overlayMessage("Writing tag...", "hold still", TFT_YELLOW);
        break;
      case tag_write::Status::Done:
        overlayMessage("Tag written!", tag_write::label(), TFT_GREENYELLOW);
        writeSettledAt = millis();
        break;
      case tag_write::Status::Failed: {
        String why = tag_write::reason();
        overlayMessage("Write failed", why.length() ? why : "use a blank NTAG", TFT_RED);
        writeSettledAt = millis();
        break;
      }
      default:
        break;
    }
  }
  if ((s == tag_write::Status::Done || s == tag_write::Status::Failed) &&
      millis() - writeSettledAt > 2500) {
    tag_write::setStatus(tag_write::Status::Idle);  // next loop repaints normal UI
  }
  return true;
}

// Sample the weight for durationMs and average the middle 5–95 % of the
// sorted samples (rejecting outliers). False if the scale yields too few
// samples (~10 Hz, so expect durationMs/100 of them).
bool measureTrimmed(uint32_t durationMs, float &avg) {
  constexpr int CAP = 160;
  static float samples[CAP];
  int n = 0;
  const uint32_t start = millis();
  while (millis() - start < durationMs && n < CAP) {
    samples[n++] = scale.readInstant();
  }
  if (n < 3) return false;

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
  avg = (float)(sum / (hi - lo));
  Serial.printf("[scale] %d samples, trimmed avg %.1f g (used %d)\n", n, avg, hi - lo);
  return true;
}

// Measure the weight for 4 s (trimmed average, after the tap settles) and
// upload the result to Spoolhouse.
void doUpload() {
  if (!canUpload()) return;
  overlayMessage("Measuring...", "hold still", TFT_SKYBLUE);
  delay(MEASURE_SETTLE_MS);

  float measured;
  if (!measureTrimmed(UPLOAD_MEASURE_MS, measured)) {
    overlayMessage("No reading", "", TFT_RED);
    delay(1500);
    restoreUi();
    return;
  }
  const int avg = (int)lroundf(measured);

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

// Tare with the tap disturbance filtered out: the tap itself wobbles the load
// cell, so wait for it to settle, then use a trimmed average as the new zero.
void doTare(const char *source) {
  if (!scaleOk) return;
  overlayMessage("Taring...", "hold still", TFT_SKYBLUE);
  delay(MEASURE_SETTLE_MS);

  float avg;
  if (!measureTrimmed(TARE_MEASURE_MS, avg)) {
    overlayMessage("No reading", "", TFT_RED);
    delay(1500);
    restoreUi();
    return;
  }
  scale.tareBy(avg);
  Serial.printf("[scale] tared (%s, zeroed out %.1f g)\n", source, avg);

  overlayMessage("Tared", "", TFT_GREENYELLOW);
  delay(800);
  restoreUi();  // repaints the weight, which snaps to ~0 g
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

// Status callback for the browser firmware-upload flow (drawn full-screen).
void webStatus(const char *l1, const char *l2) { overlayMessage(l1, l2, TFT_SKYBLUE); }

// Enable over-the-air firmware updates (so the case never has to be opened to
// flash). Requires WiFi to be connected. Shows progress on the display.
void setupOta() {
  ArduinoOTA.setHostname(OTA_HOSTNAME);
#ifdef OTA_PASSWORD
  if (strlen(OTA_PASSWORD) > 0) ArduinoOTA.setPassword(OTA_PASSWORD);
#endif
  ArduinoOTA.onStart([]() { overlayMessage("Firmware update", "starting...", TFT_SKYBLUE); });
  ArduinoOTA.onProgress([](unsigned int prog, unsigned int total) {
    static int lastPct = -1;
    const int pct = total ? (int)(prog * 100 / total) : 0;
    if (pct == lastPct) return;
    lastPct = pct;
    tft.fillRect(0, tft.height() / 2, tft.width(), 40, TFT_BLACK);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.drawString(String(pct) + "%", tft.width() / 2, tft.height() / 2 + 14, 4);
  });
  ArduinoOTA.onEnd([]() { overlayMessage("Update complete", "rebooting", TFT_GREENYELLOW); });
  ArduinoOTA.onError([](ota_error_t) { overlayMessage("Update failed", "", TFT_RED); });
  ArduinoOTA.begin();
  Serial.printf("[ota] ready: %s (%s)\n", OTA_HOSTNAME, WiFi.localIP().toString().c_str());
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

  initDisplay();

  touchSpi.begin(PIN_TOUCH_SCK, PIN_TOUCH_MISO, PIN_TOUCH_MOSI, PIN_TOUCH_CS);
  touch.begin(touchSpi);
  touch.setRotation(1);

  scaleOk = scale.begin(PIN_HX711_DT, PIN_HX711_SCK, config_store::countsPerGram());
  Serial.printf("[scale] HX711 %s\n", scaleOk ? "ready, tared" : "NOT FOUND");

  spoolRegistry.add(&bambuDecoder);
  spoolRegistry.add(&crealityDecoder);
  spoolRegistry.add(&openTagDecoder);
  tag_write::begin();

  // Paint a boot screen NOW: tft.init() leaves the panel as uninitialised GRAM
  // (fuzzy noise), and provision() below blocks for seconds while WiFi connects.
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_SKYBLUE, TFT_BLACK);
  tft.drawString("SPOOLHOUSE", tft.width() / 2, tft.height() / 2 - 16, 4);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("connecting to WiFi...", tft.width() / 2, tft.height() / 2 + 16, 2);

  // Connect to WiFi, or open the setup AP portal (shows drawSetupScreen). This
  // blocks until connected; the portal reboots the device once provisioned.
  spoolhouse::provision(drawSetupScreen);

  setupOta();  // wireless firmware updates (WiFi is up now)
  // http://spoolhouse-scale.local/ — config, tag writing, upload, display reset
  web_config::begin(&scale, webStatus, resetDisplay);

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
  ArduinoOTA.handle();  // service wireless firmware updates
  web_config::handle();  // service the device config web page
  syncNfcState();        // pick up the latest NFC result from core 0
  if (scaleOk) scale.update();

  // A tag write (config page) takes over the screen and NFC reader; suppress
  // the normal UI and tap handling while it's in progress.
  const bool writeActive = serviceTagWrite();
  if (!writeActive) pollInputs();

  const uint32_t now = millis();
  // Don't repaint the normal UI while a factory-reset warning/countdown overlay
  // is showing (resetCountdownSec >= 0) or a tag-write overlay is up — otherwise
  // the weight reading pops through over it.
  if (!writeActive && resetCountdownSec < 0 && now - lastDrawMs >= DISPLAY_UPDATE_INTERVAL_MS) {
    // Defer the repaint while the NFC bus is actively transacting so the TFT
    // write doesn't overlap a reader burst (the white-out trigger during tag
    // reads). Capped, so the display still refreshes even if NFC stays busy.
    if (nfcBusBusy && now - lastDrawMs < MAX_DRAW_DEFER_MS) {
      // skip this frame; try again next loop (~5 ms later)
    } else {
      lastDrawMs = now;
      drawWeight();
      drawInfo();
      drawWifiStatus();
    }
  }
  delay(5);  // yield to the idle task (NFC no longer blocks this loop)
}
