# Spoolhouse – Design-Entwürfe

Export der Artboards aus dem Design-Canvas „Spoolhouse – Redesign mit Sidebar". Jede `*.dc.html` ist ein Screen als statisches HTML-Mockup (Design-Component-Format: `{{…}}`-Platzhalter, `<sc-if>`, `<dc-import>` und ein kleines `Component`-Script für Tweaks wie `dark`).

## So liest man die Dateien

- **Tokens & Komponenten:** `spoolhouse.css`. Light-Werte unter `.app`, Dark unter `.app.dark`. Die Werte entsprechen den Tokens aus `app/globals.css` (Hex-Umrechnung der oklch-Werte) plus `--ink` (kräftige Linien/Etikett-Rahmen) und `--scrim`.
- **Schriften:** Barlow Condensed 600 (Display: Seitentitel, Abschnittsköpfe, Materialnamen, große Zahlen), Geist (UI/Fließtext), Geist Mono (Messwerte, Chips, Labels).
- **Teil 1** (Main, OverviewDark, Inventory, Statistics, Group, Sidebar, Mobile*) hat das CSS noch inline im `<helmet>`; **Teil 2** nutzt `spoolhouse.css` und die gemeinsame Sidebar `Nav.dc.html`.
- **`*Dark.dc.html`** sind meist nur Hüllen, die die Light-Datei mit `dark=true` einbinden → für die Umsetzung zählt die Light-Datei + `.app.dark`.
- **`canvas.json`** ordnet die Dateien den Canvas-Seiten zu (Teil 1 · Kern, Material & Spulen, Catalog & Admin, Borrows/Groups/Account, Auth & Muster).
- Beispieldaten (Namen, Gewichte, E-Mails @example.org) sind erfunden.

## Mapping auf shadcn/ui (Vorschlag)

| Design-Klasse | shadcn / Tailwind |
| --- | --- |
| `.btn-acc` / `.btn-pri` / `.btn-out` / `.btn-danger` | `Button` Varianten (accent neu, default, outline, destructive) |
| `.tag`, `.tag.low/.acc/.mut/.inv/.rej` | `Badge` – eckig (radius 3px), Mono, Versal |
| `.meter` | `Progress` mit segmentierter Maske |
| `.dlg` / `.pop` | `Dialog` / `Popover` bzw. `Command` |
| `.seg` | `ToggleGroup` |
| `.switch`, `.radio`, `.chk` | `Switch`, `RadioGroup`, `Checkbox` |
| `.slot` | Spulen-Kachel (eigene Komponente) |
| `.ro` | KPI-Leiste (eigene Komponente) |
| `.sec` | Abschnittskopf: Nummer + Label + Linie |
