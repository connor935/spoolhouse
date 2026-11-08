# Spoolhouse Scale — wiring & assembly

The wiring design of the Spoolhouse Scale, created with
[**Wiring Viz**](https://github.com/aaronbeckmann/wiringviz) — a schematic
editor for wiring harnesses (boards, connectors, wires, parts/BOM, assembly
instructions), which generated every file in this folder.

## Files

| File | What it is |
| --- | --- |
| `Spoolhouse-Scale.harness.json` | **The editable project.** The single source of truth: all boards, connectors, wires, the parts library/BOM and the assembly-instructions text. Import it into Wiring Viz to view or change the design, then re-export the files below. |
| `Spoolhouse-Scale.pdf` | **Generated documentation** (from *Export PDF*): page 1 the wiring schematic, then the connections table (every wire with from/to, color, gauge, net), the bill of materials with costs, and the typeset assembly instructions. This is the file to print or send along. |
| `wiring.png` | **Schematic image** (from *Export PNG*) — a quick-look/embeddable render of the wiring diagram, without the tables. |

The design covers the scale's boards (ESP32 Cheap Yellow Display, HX711,
NFC reader, the four weight sensors) and all the wiring between them —
see `../manual.md` for the full build & usage manual.

## Editing the design

1. Get Wiring Viz: clone [aaronbeckmann/wiringviz](https://github.com/aaronbeckmann/wiringviz)
   and `npm install && npm run dev`, run the Docker image, or use the desktop app.
2. **Import** → pick `Spoolhouse-Scale.harness.json`.
3. Make changes (the *Manual* tab inside the app documents everything).
4. Re-export **JSON** (replace the file here — it's the master), **PDF**, and **PNG**.
