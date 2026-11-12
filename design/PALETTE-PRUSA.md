# Auftrag: Spoolhouse auf Farbpalette „A · Prusa Orange & Graphit" umstellen

Du bist eine Claude-Code-Instanz im Spoolhouse-Repo (Next.js, Tailwind v4, shadcn/ui auf Base UI). Stelle die App von der bisherigen Petrol-Palette auf die Palette **A · Prusa Orange & Graphit** um. **Nur Farben ändern** – Layout, Typografie (Barlow Condensed / Geist / Geist Mono), Abstände und Komponentenstruktur bleiben unverändert.

Referenz im Repo:

- `design/palettes.css` → Block `.app.pal-prusa` (Light) und `.app.pal-prusa.dark` (Dark). Das ist die Quelle der Wahrheit.
- `design/OverviewPalette.dc.html` (Light, `palette="prusa"`) und `design/OverviewPrusaDark.dc.html` als Sollbild der Startseite.
- `design/spoolhouse.css` zeigt, welche Klassen welche Tokens nutzen.

---

## 1. Tokens in `app/globals.css` ersetzen

Ersetze die Werte in `:root` (Light) und `.dark` (Dark). Behalte die vorhandenen Token-Namen bei; falls ein Name im Projekt anders heißt, mappe sinngemäß. Hex-Werte stehen als Kommentar dabei.

### Light (`:root`)

```css
--background: oklch(0.97 0 0); /* #F5F5F4 */
--foreground: oklch(0.218 0 0); /* #1A1A1A */
--card: oklch(1 0 0); /* #FFFFFF */
--card-foreground: oklch(0.218 0 0);
--popover: oklch(1 0 0);
--popover-foreground: oklch(0.218 0 0);
--primary: oklch(0.218 0 0); /* #1A1A1A – Graphit-Buttons */
--primary-foreground: oklch(1 0 0);
--secondary: oklch(0.936 0.003 106.5); /* #EAEAE8 */
--secondary-foreground: oklch(0.218 0 0);
--muted: oklch(0.936 0.003 106.5); /* #EAEAE8 */
--muted-foreground: oklch(0.474 0.003 106.5); /* #5C5C5A */
--accent: oklch(0.693 0.191 39.3); /* #FA6832 Prusa Orange */
--accent-foreground: oklch(
  0.218 0 0
); /* DUNKLER Text auf Orange, nicht weiß! */
--accent-ink: oklch(0.553 0.174 38.4); /* #C2410C – Orange als TEXTfarbe */
--data: oklch(0.693 0.191 39.3); /* #FA6832 – Füllstände & Diagramme */
--destructive: oklch(
  0.538 0.2 19.9
); /* #C81E3A – Karmin, bewusst kühler als das Orange */
--destructive-foreground: oklch(1 0 0);
--border: oklch(0.888 0.004 106.5); /* #DADAD7 */
--input: oklch(0.888 0.004 106.5);
--ring: oklch(0.693 0.191 39.3); /* #FA6832 */
--ink: oklch(
  0.218 0 0
); /* kräftige Linien / Etikett-Rahmen, falls im Projekt vorhanden */
--chart-1: oklch(0.693 0.191 39.3); /* #FA6832 */
--chart-2: oklch(0.218 0 0); /* #1A1A1A */
--chart-3: oklch(0.824 0.106 46.5); /* #FFB08A */
--chart-4: oklch(0.693 0 0); /* #9C9C9C */
--chart-5: oklch(0.553 0.174 38.4); /* #C2410C */
--sidebar: oklch(0.985 0 0); /* #FAFAF9 */
--sidebar-foreground: oklch(0.218 0 0);
--sidebar-primary: oklch(
  0.693 0.191 39.3
); /* aktiver Strich links, Badge-Pillen */
--sidebar-primary-foreground: oklch(0.218 0 0);
--sidebar-accent: oklch(
  0.936 0.003 106.5
); /* aktiver Eintrag Hintergrund #EAEAE8 */
--sidebar-accent-foreground: oklch(0.218 0 0);
--sidebar-border: oklch(0.888 0.004 106.5);
--sidebar-ring: oklch(0.693 0.191 39.3);
```

### Dark (`.dark`)

```css
--background: oklch(0.182 0 0); /* #121212 */
--foreground: oklch(0.946 0 0); /* #EDEDED */
--card: oklch(0.222 0 0); /* #1B1B1B */
--card-foreground: oklch(0.946 0 0);
--popover: oklch(0.222 0 0);
--popover-foreground: oklch(0.946 0 0);
--primary: oklch(0.946 0 0); /* #EDEDED */
--primary-foreground: oklch(0.182 0 0);
--secondary: oklch(0.269 0 0); /* #262626 */
--secondary-foreground: oklch(0.946 0 0);
--muted: oklch(0.269 0 0); /* #262626 */
--muted-foreground: oklch(0.693 0 0); /* #9C9C9C */
--accent: oklch(0.693 0.191 39.3); /* #FA6832 – gleich wie Light */
--accent-foreground: oklch(0.151 0.026 50.9); /* #140803 */
--accent-ink: oklch(0.753 0.157 43.4); /* #FF8A57 – hellere Textvariante */
--data: oklch(0.693 0.191 39.3);
--destructive: oklch(0.692 0.2 17); /* #FF5A6E */
--destructive-foreground: oklch(0.167 0.047 15.3); /* #1F0508 */
--border: oklch(1 0 0 / 10%);
--input: oklch(1 0 0 / 14%);
--ring: oklch(0.693 0.191 39.3);
--ink: oklch(0.946 0 0 / 50%);
--chart-1: oklch(0.693 0.191 39.3);
--chart-2: oklch(0.946 0 0);
--chart-3: oklch(0.824 0.106 46.5);
--chart-4: oklch(0.693 0 0);
--chart-5: oklch(0.753 0.157 43.4);
--sidebar: oklch(0.205 0 0); /* #171717 */
--sidebar-foreground: oklch(0.946 0 0);
--sidebar-primary: oklch(0.693 0.191 39.3);
--sidebar-primary-foreground: oklch(0.151 0.026 50.9);
--sidebar-accent: oklch(0.269 0 0); /* #262626 */
--sidebar-accent-foreground: oklch(0.946 0 0);
--sidebar-border: oklch(1 0 0 / 10%);
--sidebar-ring: oklch(0.693 0.191 39.3);
```

### Neue Tokens in Tailwind registrieren

Im `@theme inline`-Block ergänzen, damit `text-accent-ink`, `bg-data` usw. funktionieren:

```css
--color-accent-ink: var(--accent-ink);
--color-data: var(--data);
--color-ink: var(--ink); /* nur falls noch nicht vorhanden */
```

---

## 2. Verwendungsregeln (wichtig – Orange ist hell!)

Prusa-Orange hat auf Weiß nur ca. 2,9:1 Kontrast. Deshalb:

1. **Text in Akzentfarbe** (Links, Abschnittsnummern „01", „● 11:40", Chip „REQUEST", Breadcrumb-Nummer, „Inventory →"-Links) → **`text-accent-ink`**, nie `text-accent`.
2. **Flächen in Akzentfarbe** (Button „Add spool", FAB, Logo-Kachel, Badge-Pillen in der Sidebar, aktiver Strich) → `bg-accent` **mit `text-accent-foreground` (dunkel)**. Kein weißer Text auf Orange.
3. **Outline-Chips mit Akzent** (`LENT · JONAS`, `OUT`, „Awaiting approval") → Rahmen und Text `accent-ink`.
4. **Aktives Sidebar-Icon** → `text-accent-ink` (das Icon braucht ≥ 3:1).
5. **Füllstandsbalken, Sparkline, Monatsbalken** → `bg-data` / `stroke-data`. Der höchste Balken (Peak) darf `bg-accent` sein, der laufende Monat bleibt schraffiert in `data`.
6. **Low / kritisch** → `destructive` (Karmin), nicht Orange. „LOW"-Chip gefüllt `bg-destructive text-destructive-foreground`.
7. **Primär-Buttons** (Approve, Save, Request) → Graphit (`bg-primary`), damit Orange exklusiv für die Hauptaktion und Daten bleibt.
8. **Material-Swatches** bleiben unverändert (echte Materialfarben).

---

## 3. Hartkodierte Altfarben aufspüren

Suche im ganzen Repo (ohne `design/` und `node_modules`) nach Resten der alten Palette und ersetze sie durch Tokens:

```
#007785  #0F919C  #072D3D  #F7FBFC  #071117  #0C1A22  #18262E  #E8F0F3  #D6E0E3  #59656E  #8D9BA3
oklch(0.52 0.09 210)  oklch(0.6 0.1 205)  oklch(0.28 0.05 230)
```

Außerdem jede Klasse mit `text-accent` darauf prüfen, ob sie Text färbt → dann `text-accent-ink` (Regel 1).

---

## 4. Drumherum

- **Browser-Theme-Color** (`<meta name="theme-color">` / `viewport.themeColor` in `app/layout.tsx`): Light `#F5F5F4`, Dark `#121212`.
- **App-Icon / Favicon / Manifest**: Kachel `#FA6832`, „Boxes"-Icon in `#1A1A1A` (statt fast-weiß), Eckradius unverändert. Icons neu generieren, `manifest` `theme_color: "#FA6832"`, `background_color: "#121212"`.
- **Selection / Scrollbar**, falls gestylt: Auswahl `accent` mit 25 % Deckkraft.
- **Focus-Ring**: `ring` ist Orange – auf Orange-Buttons zusätzlich `ring-offset` nutzen, damit er sichtbar bleibt.

---

## 5. Abnahme

- [ ] Startseite in Light und Dark entspricht `design/OverviewPalette.dc.html` bzw. `design/OverviewPrusaDark.dc.html`.
- [ ] Kein weißer Text auf Orange; kein orangefarbener Fließtext auf hellem Grund (nur `accent-ink`).
- [ ] „Low" ist klar von normalen Füllständen unterscheidbar (Karmin vs. Orange).
- [ ] Inventory, Material-Detail, Statistics, Borrows, Groups, Catalog, Admin und Dialoge in beiden Modi durchklicken; keine Petrol-Reste.
- [ ] `npm run build` / Lint ohne Fehler.

Wenn ein Token im Projekt fehlt oder anders benannt ist: nicht raten, sondern in `design/palettes.css` (`.pal-prusa`) nachsehen und sinngemäß zuordnen.
