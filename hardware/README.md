# Spoolhouse scale firmware

PlatformIO firmware for an ESP32 **Cheap Yellow Display** (ESP32-2432S028R) that turns a
5 kg load cell + NFC reader into a spool scale: the display shows the current weight and,
when a recognized filament spool is placed on it, the decoded filament details
(manufacturer, material, colour, nominal weight, hotend temps).

**Tap the touchscreen to tare** (zero) the scale — any touch triggers it, and the
on-screen TARE bar flashes green to confirm. The on-board BOOT button also tares, as a
backup. The scale additionally tares on boot, so whatever sits on it at power-up reads 0 g.

## Build & flash

Requires [PlatformIO](https://platformio.org/) (`pio`).

```sh
pio run                 # compile
pio run -t upload       # flash over USB
pio device monitor      # serial log @ 115200
```

## Wiring

Display and XPT2046 touch use the CYD's stock wiring (nothing to connect). The TFT is
driven on the **HSPI** peripheral (`USE_HSPI_PORT`); the touch controller uses the **VSPI**
peripheral on its own dedicated pins. Only the external sensors below need wiring.

| Peripheral | Signal | ESP32 pin |
|---|---|---|
| HX711 (5 kg cell) | DT | IO22 |
| | SCK | IO27 |
| CLRC663 (SPI mode) | MOSI | IO23 |
| | MISO | IO19 |
| | SCK | IO18 |
| | SS | IO5 (the former SD-card CS pad) |
| XPT2046 touch (on-board) | CLK / CS / MOSI / MISO / IRQ | IO25 / IO33 / IO32 / IO39 / IO36 |

Notes:

- The **SD-card holder is removed** from this board; its CS pad (IO5) is repurposed as
  the CLRC663 chip select. The chip select must go to a real GPIO, **not** ground — SPI
  register accesses are framed by chip-select edges.
- The CLRC663 is driven as **software SPI** (bit-banged), which frees the VSPI hardware
  peripheral for the touchscreen; UID polling doesn't need hardware-SPI speed. A MIFARE
  auth can still occasionally fail on first contact, so decoders retry a few times.
- Touch tare uses only press *detection* (no coordinate mapping), so it needs no
  calibration — any touch tares.

## Weight calibration

`HX711_COUNTS_PER_GRAM` in `include/config.h` is a placeholder. To calibrate:

1. Flash, open the serial monitor, and let it tare (empty scale at boot = 0 g).
2. Put a known weight on the scale (e.g. a 500 g calibration weight).
3. Adjust `HX711_COUNTS_PER_GRAM` by `displayed grams / real grams` and re-flash until
   the display matches. (Higher factor → lower displayed weight.)

The scale tares on every boot: whatever is on it at power-up reads as 0 g.

## Two abstraction layers

The firmware separates *which reader chip* from *which tag format*, so both sides evolve
independently.

### NFC reader — `src/nfc/`

`nfc_reader.h` defines the `NfcReader` interface: `begin()`, `readUid()`, `chipName()`,
and — for encrypted vendor tags — `mifareReadBlock()` (re-select + authenticate a sector
with a 6-byte key + read a block) guarded by `supportsMifareClassic()`. `main.cpp` and the
spool decoders only talk to this interface. The active implementation is the **CLRC663**
(`clrc663_reader.{h,cpp}`, via the iwanders/MFRC630 library); a PN532 implementation
(`pn532_reader.{h,cpp}`) is kept as an alternate.

Swapping readers is the one instance line in `main.cpp` (`NfcReader &nfc = …`).
Nothing else changes.

### Spool tag formats — `src/spool/`

`spool_decoder.h` defines `SpoolDecoder`: each manufacturer decoder both *detects* whether
a tag is theirs and *decodes* it into the normalized `FilamentInfo` (`filament_info.h`).
`SpoolRegistry` tries each decoder in order and returns the first match; `main.cpp`
registers them and never hard-codes a manufacturer.

Implemented decoders (registered in `main.cpp`, tried in this order):

| Decoder | Tag | Keys / access | Status |
|---|---|---|---|
| **Bambu Lab** (`bambu_decoder`) | MIFARE Classic 1K | per-sector Key A = HKDF-SHA256(UID) — `bambu_keys.{h,cpp}` | **verified on hardware** (material always; colour/weight best-effort) |
| **Creality** (`creality_decoder`) | MIFARE Classic 1K | default key `FF…FF`, ASCII in blocks 4–6 | untested — needs a Creality spool |
| **OpenTag3D** (`opentag_decoder`) | NTAG21x, NDEF | MIME `application/opentag3d`, fixed binary payload | untested — needs an OpenTag spool |

The Bambu key derivation is community-reverse-engineered and published for
interoperability. The Creality format is only partially documented publicly (no reliable
weight field), so that decoder surfaces manufacturer, material id and colour. OpenTag3D is
read via the NTAG page path (`readNtagPages` on `NfcReader`); the sibling **OpenPrintTag**
spec is similar but distinct — a future decoder in this same interface.

Adding a manufacturer: implement `SpoolDecoder` in a new `src/spool/*_decoder.{h,cpp}` and
register it in `main.cpp`. Reader and decoders are independent — swapping the NFC chip
never touches the decoders, and vice versa.
