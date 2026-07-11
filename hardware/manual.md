# Spoolhouse Scale — Manual

A WiFi filament scale built on an ESP32 **Cheap Yellow Display** (CYD). Put a spool
on it, and it reads the weight and — if the spool has an NFC tag — its filament
details, then uploads the reading to your Spoolhouse server with one tap.

- **Display**: current weight (zeroable) + decoded filament info
- **NFC**: reads Bambu Lab (and, experimentally, Creality / OpenTag3D) spool tags
- **Upload**: sends the measured weight to Spoolhouse over WiFi (registers or refreshes the spool by its tag)
- **Config**: a built-in web page for setup, calibration, and firmware updates — no cable needed after first flash

---

## 1. Quick start

1. **Power it on** (USB-C). On first boot with no saved WiFi it opens a setup
   Access Point — see [First-time setup](#2-first-time-setup-wifi).
2. Once connected, the display shows the weight and **"tap screen to tare"**.
3. **Place a spool.** If its tag is recognized, its material/colour/details appear
   and the hint changes to **"tap screen to upload"**.
4. **Tap the screen.** It measures for 5 seconds, then shows **"Uploaded!"** — the
   weight is now in Spoolhouse.
5. Manage everything from a browser at **http://spoolhouse-scale.local/**
   (see [The config page](#5-the-config-page)).

---

## 2. First-time setup (WiFi)

If the scale can't reach a known WiFi network, it starts a **setup portal**:

1. The screen shows **"WiFi setup — join `Spoolhouse-Setup`, open 192.168.4.1"**.
2. On your phone/laptop, join the **`Spoolhouse-Setup`** WiFi network.
3. A captive portal opens (or browse to **http://192.168.4.1**). Choose:
   - your **WiFi network** and enter its **password**,
   - the **Spoolhouse API token** (`sph_…`, from the web app's *Account → API tokens*),
   - the **Spoolhouse base URL** (e.g. `https://spoolhouse.example.com`).
4. Save. The device reboots and connects. Done.

> Only 2.4 GHz WiFi is supported (the ESP32 has no 5 GHz radio).

After setup you can change the token / base URL any time from the
[config page](#5-the-config-page) — the portal only appears when WiFi is down.

---

## 3. Everyday use

### Weighing & uploading
- **Empty scale reads 0 g** (it tares on boot).
- **Tare (zero):** when no recognized spool is present, **tap the screen** (or press
  the on-board BOOT button). The footer shows "tap screen to tare".
- **Weigh + upload:** place a tagged spool → its details appear and the footer shows
  "tap screen to upload" → **tap the screen**. The device:
  1. measures the weight for **5 seconds**,
  2. averages the middle of the readings (discarding the noisy 5 % extremes),
  3. uploads that weight to Spoolhouse, and
  4. shows **"Uploaded!"** with the value.

The upload calls `POST /api/v1/spools/weigh`, which **registers** the spool on first
sight (creating the material/spool-type from the tag) or **refreshes** its weight
thereafter. New spools register with an assumed **250 g empty-spool weight** — adjust
the spool type in the web app for exact "filament remaining".

### What the display shows
- Top: title + WiFi indicator.
- Middle: spool info when a tag is recognized — manufacturer, material, a colour
  swatch, nominal weight / diameter / length, spool ID, production date.
- If a tag isn't recognized: "Unknown tag" + its UID.
- Bottom: the large weight readout, then the tap hint.

### Supported filament tags
- **Bambu Lab** — fully supported and verified (MIFARE Classic; keys derived from the
  tag UID).
- **Creality** and **OpenTag3D / OpenPrintTag** — decoders are implemented but **not
  yet verified on real tags**; treat as experimental.

---

## 4. Calibrating the weight

Do this once (or whenever readings drift). Easiest via the [config page](#5-the-config-page):

1. Remove everything from the scale, press **Tare (zero)**.
2. Place a **known weight** (e.g. a 500 g calibration weight).
3. Enter that weight in grams and press **Calibrate**.

The device computes and stores the calibration factor (counts/gram) and applies it
immediately — no reflash. It's kept in flash and survives reboots (a factory reset
returns it to the firmware default).

---

## 5. The config page

Open **http://spoolhouse-scale.local/** (or the device's IP, e.g.
`http://192.168.1.184/`) from any device on the same network.

> Use **http://**, not `https://` — the device serves plain HTTP.
> The page has **no login** (it's meant for your trusted LAN). Form submissions are
> protected against cross-site requests.

Sections:
- **Weight** — live reading + **Tare (zero)**.
- **Calibrate** — guided calibration (see [above](#4-calibrating-the-weight)).
- **Spoolhouse server** — change the **base URL** and **API token** (leave the token
  blank to keep the current one).
- **Firmware update** — upload a new `.bin` (see below).

The page follows the Spoolhouse web-app design and your phone's light/dark theme.

---

## 6. Updating the firmware

Three ways, no case-opening needed after the first flash:

### A. Browser upload (easiest)
1. Build the firmware (`pio run -e cyd`) — the file is
   `hardware/.pio/build/cyd/firmware.bin`.
2. On the config page → **Firmware update** → choose the `.bin` → **Upload & flash**.
3. The screen shows progress; the device reboots into the new firmware.

### B. Over-the-air from PlatformIO
```sh
pio run -e cyd_ota -t upload --upload-port spoolhouse-scale.local
# or use the device IP; add the OTA password if set:
#   --upload-flags "--auth=<OTA_PASSWORD>"
```
> On Windows you may need to allow the PlatformIO Python through the firewall the
> first time (it receives the image transfer).

### C. USB
```sh
pio run -e cyd -t upload
```

If a bad/incompatible image is uploaded, the update fails safely and the device keeps
running the current firmware (it only reboots on success).

---

## 7. Factory reset

Erases the saved WiFi, API token, base URL, and calibration (reverting to the
compiled defaults) and reopens the setup portal.

1. **Press and hold the touchscreen.**
2. At **10 s** a countdown warning appears; at **15 s** it turns red. *Release any
   time before 20 s to cancel.*
3. At **20 s** a confirmation screen shows **Go back** and **RESET**.
4. **Lift your finger**, then deliberately **tap RESET** to wipe. Tapping anywhere
   else (or waiting) cancels — so an accidental hold can't reset the device.

After a reset the scale boots into the WiFi setup portal.

---

## 8. Hardware & wiring

Board: **ESP32-2432S028R "Cheap Yellow Display"** (ILI9341 TFT + XPT2046 touch).

| Peripheral | Signal | ESP32 pin |
|---|---|---|
| HX711 load cell (5 kg) | DT | IO22 |
| | SCK | IO27 |
| PN532 NFC (SPI mode) | MOSI | IO23 |
| | MISO | IO19 |
| | SCK | IO18 |
| | SS | IO5 (former SD-card CS pad; SD holder removed) |
| XPT2046 touch (on-board) | CLK / CS / MOSI / MISO / IRQ | IO25 / IO33 / IO32 / IO39 / IO36 |

Notes:
- The TFT uses the CYD's stock wiring on the **HSPI** peripheral. Touch uses the
  **VSPI** peripheral. The PN532 is **bit-banged software SPI** on its own pins, and
  runs on a **separate CPU core** so NFC reads don't stutter the display.
- The PN532's SS must go to a real GPIO (IO5), **not** ground — it wakes on a falling
  SS edge and stays silent if SS is tied low.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `spoolhouse-scale.local` won't load | Use **http://**, not https. If mDNS `.local` doesn't resolve, use the device's IP (shown by your router, or on the serial log as `[wifi] connected: <ip>`). |
| Setup AP appears unexpectedly | The saved WiFi wasn't reachable. Re-enter it in the portal. |
| NFC not detected / "NFC reader offline" | Check the PN532 wiring, especially **SS → IO5** (not GND) and MOSI/MISO not swapped. The reader re-initialises every few seconds. |
| Tag shows "Unknown tag" | Not a supported tag (only Bambu Lab is verified), or a transient read — re-seat the spool. |
| Colours look wrong on the display | The panel runs inverted + a gamma tweak is applied in firmware; if a swatch still looks off, it's the tag's actual (often muted) colour. |
| Weight is negative or wildly off | Re-calibrate (Section 4). The load-cell polarity sets the sign automatically during calibration. |
| Screen shows noise on boot, then whites out | Almost always **marginal power** (thin/long USB VCC line) causing a brownout when WiFi powers up. Use a solid 5 V source / good cable. The serial log reset reason (`RTCWDT_BROWN_OUT_RESET`) confirms brownout. |
| Serial port keeps dropping when flashing | Flaky USB **data** lines — use OTA/browser updates instead, or a known-good cable/port. |

---

## 10. Building from source

Requires [PlatformIO](https://platformio.org/).

1. Copy `hardware/include/secrets.h.example` → `hardware/include/secrets.h` and fill in
   WiFi (optional fallback), `SPOOLHOUSE_URL`, `SPOOLHOUSE_TOKEN`, and `OTA_PASSWORD`.
   `secrets.h` is git-ignored.
2. Build & flash:
   ```sh
   pio run -e cyd -t upload        # USB
   pio device monitor              # serial log @ 115200
   ```
3. Partition scheme is **`min_spiffs`** (two OTA app slots) so over-the-air / browser
   updates work — don't switch to `huge_app`, which has a single app slot and can't OTA.

The source is under `hardware/src/` (`main.cpp`, `scale.*`, `nfc/`, `spool/`, `net/`,
`config_store.*`). Runtime config (token, URL, calibration, WiFi) lives in NVS; the
`secrets.h` values are only compile-time defaults / fallbacks.
