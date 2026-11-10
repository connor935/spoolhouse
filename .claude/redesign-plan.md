# Plan: Spoolhouse UI Redesign ("Redesign mit Sidebar")

**Trunk branch**: `feature/redesign-spoolhouse-ui` (forked from `main` @ `3df187a`)
**Design source**: `.claude/design/` (committed on the trunk)
**Complexity**: Large (≈ 50 screens / 26 light boards, ~75 existing components, new IA)
**Status**: confirmed 2026-11-10 — Phases 0–2 in progress on `redesign/foundation`

---

## 1. What the design is

`.claude/design/README.md` (German) + `.claude/design/canvas.json` + 55 `*.dc.html` mockups.

- `*.dc.html` = static HTML mockups (Design-Component format: `{{…}}` placeholders, `<sc-if>`,
  `<dc-import>`, a small `Component` class for tweaks like `dark`).
- `*Dark.dc.html` are mostly wrappers that import the light file with `dark=true` → implement
  from the **light file + `.app.dark` tokens**.
- **Teil 1** (Main, OverviewDark, Inventory, Statistics, Group, Sidebar, Mobile*) has CSS inline
  in `<helmet>`; **Teil 2** uses the shared `.claude/design/spoolhouse.css` and the shared sidebar
  `Nav.dc.html`. `spoolhouse.css` is the canonical token + component reference.
- Sample data (names, weights, `@example.org`) is fake.
- To read a mockup quickly, strip `<style>/<script>/<svg>` and tags (a throwaway python
  one-liner works), or open the file in a browser for the visual.

### Canvas pages → boards

| Canvas page | Boards (light) |
|---|---|
| Teil 1 · Kern | Main (Overview), Inventory, Statistics, Group, Sidebar (expanded/collapsed/states), MobileInventory (bottom nav), MobileDrawer, Nav (component) |
| Material & Spulen | MaterialDetail (+Mobile), SpoolAdd, SpoolEdit, Reweigh (popover + mobile sheet), SpoolSheetMobile |
| Catalog & Admin | CatalogMaterials, CatalogSpoolTypes, CatalogMobile, RequestForms, AdminMaterials, ReviewQueue, AdminUsers, AdminProperties, PropertyDialog, AdminImport |
| Borrows, Groups, Account | Borrows, Notifications, BorrowDialog, Groups, GroupSettings, JoinGroup, Account |
| Auth & Muster | Auth (sign in / up / reset), Patterns (filters panel, destructive confirm, toasts, empty states, 404), FiltersMobile |

### Visual language (from `spoolhouse.css`)

- **Tokens**: same palette as today's `app/globals.css` (hex conversions of the oklch values) plus
  new `--ink` (strong lines, label borders: `#0D1C27` light / `rgba(238,243,244,.55)` dark),
  `--scrim`, `--sw-ring` (swatch ring), `--sb-active`/`--sb-active-fg` (sidebar active).
  Light accent `#007785`, dark accent `#0F919C`, dark bg `#071117`.
- **Fonts**: **Barlow Condensed 600** (display: page titles, section heads, material names, big
  numbers — uppercase), **Geist** (UI/body), **Geist Mono** (measurements, chips, labels,
  kickers — tabular nums). Barlow is new; Geist + Geist Mono are already loaded in
  `app/layout.tsx`.
- **"Lab label" aesthetic**: 1px `--ink` borders on tiles/inputs/dialogs, 2px ink rule under
  page headers & dialog headers, tight radii (tags 3px, tiles 4px, buttons/inputs 6px,
  dialogs 8px), mono uppercase kickers like `02 — Inventory`, numbered section headers
  (`01 Running low ─────── Inventory →`).
- **Key classes → components** (README's own suggested mapping, extended):

| Design class | Target |
|---|---|
| `.btn-acc/.btn-pri/.btn-out/.btn-ghost/.btn-danger/.btn-dout`, `.btn-sm/.btn-lg`, `.ibtn`, `.linkbtn` | `Button` variants `accent` (new), `default`, `outline` (ink border), `ghost`, `destructive`, `destructive-outline` (new); sizes sm 30 / default 36 / lg 44 / icon 28; `link` → mono uppercase |
| `.tag` + `.low/.rej/.acc/.mut/.inv/.fill` | `Badge` — square (3px), mono, uppercase, 18px tall |
| `.kbd` | `Kbd` (shortcut hint inside buttons: `Add spool N`) |
| `.meter` (`.low/.err`) | `Meter` — segmented progress via CSS mask |
| `.sw` | `Swatch` (material colour dot) |
| `.slot`, `.slot.add`, `.slot.sel` | `SpoolTile` / `AddSpoolTile` |
| `.ro` | `ReadoutStrip` (KPI row) + `Readout` (kicker + `.num` + sub-line) |
| `.sec` | `SectionHeader` (number + label + rule + optional link/kicker) |
| `.head`/`.crumb`/`.h1` | `PageHeader` (kicker/breadcrumb, display title, actions, 2px ink rule) |
| `.dlg/.dlg-h/.dlg-b/.dlg-f`, `.scrim` | `Dialog` restyle (header with ink rule, muted footer) |
| `.pop`/`.opt`/`.opt.hl` | `Popover` / `Command`-style combobox list |
| `.seg` | `ToggleGroup` (segmented, inverted active) |
| `.switch`, `.radio` (card radio), `.chk` | `Switch`, `RadioGroup` (card variant), `Checkbox` |
| `.field/.lab/.help/.inp(.foc/.bad/.ink/.r)/.unit` | `Field` + `Input` with unit adornment, right-aligned mono numeric variant, error state |
| `.tbl`, `.mfr`, `.crow`, `.kv` | `Table` restyle, `ManufacturerHeader`, `CatalogRow`, `KeyValueRow` |
| `.empty`, `.alert`, `.note`, `.inset`, `.result`, `.toast(.err)`, `.tip` | `EmptyState`, `Alert` (destructive/note), `Inset`, `ResultBox`, sonner theme, `Tooltip` |
| `.nav/.nav.on/.nav.sub/.pill/.cnt/.logo` | `AppSidebar` items (active = 3px accent bar; accent `pill` only when something waits for you, muted `cnt` for plain counts) |
| `.cb/.cb.now`, `.ruler` | `UsageBarChart` (bars, hatched current month), ruler decoration |
| `.avt` | `InitialsAvatar` |

## 2. Information architecture change (the big one)

Today: one tabbed dashboard (`/`: In stock / Empty / All / Borrows / one tab per group) +
`PageShell` sub-pages (`max-w-3xl`, back link). New: **persistent sidebar app shell**.

**Sidebar** (240px expanded / 56px collapsed rail with tooltips + corner pills; mobile = top bar +
bottom nav `Home · Stock · Borrows · Groups · Stats` + drawer):
`Overview · Inventory (14) · Borrows (●1) · Groups ▸ [each group (count)] · Statistics ·
Notifications (●4)` — `Catalog: Materials · Spool types` — `Admin: Users · Review materials (●7) ·
Review spool types (●2) · Properties · Import catalog` — user menu at the bottom (Account,
Theme Light/Dark/System, Sign out).

| Route | Today | Design |
|---|---|---|
| `/` | tabbed dashboard | **Overview** (new): KPI strip (spools in stock, filament left, used 30 d with Δ vs prev 30 d, stock value), Running low, Monthly usage, Recent activity, Borrows summary, Needs drying, Groups |
| `/inventory` | (dashboard tabs) | **new page**: seg `In stock / Empty / All`, filter panel (URL state), material blocks with spool tiles; click tile → re-weigh popover |
| `/materials/[id]` | `material-dialog.tsx` | **new page** Material detail: readouts, your spools (tiles), usage 12 mo, properties (wiki edit), "In your groups" table; admin approve/reject/delete inline |
| add/edit spool | `spool-form-dialog` | stays a **dialog** (over ghost page) / **bottom sheet** on mobile; weighing history + undo in edit |
| `/borrows` | dashboard Borrows tab | **new page**: 01 requests for your spools, 02 your requests, 03 lent out, 04 borrowed by you, 05 history table |
| `/groups` | list + create/join | restyled: group cards, create, join |
| `/groups/[id]` | management only; stock lives in dashboard tabs | **Stock + Settings** sub-views (stock moves back here; settings = sharing radio cards + preview, rename, invite link, members, danger zone) |
| `/groups/join/[code]` | standalone | restyled card |
| `/stats` | | restyled: readouts, monthly usage (grams/cost toggle), by material (runway), by filament type (stock composition) |
| `/notifications` | | restyled; actionable rows open `BorrowDialog` |
| `/materials`, `/spool-types` | | restyled catalogs (filters panel, manufacturer groups, side-panel request form) |
| `/admin/materials` (+ spool types) | | table view w/ status seg + **Review queue** (new: one-at-a-time, possible duplicates, keyboard shortcuts R/E/J/A) |
| `/admin/users`, `/admin/properties`, `/admin/import`, `/account` | | restyled |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | `auth-card` | restyled auth card |
| 404 | default | designed (Patterns board) |

**Docs impact**: CLAUDE.md sections "Architecture", "Sub-page layout" (PageShell rule),
"Groups, sharing & lending" (stock location), component-folder table must be rewritten as part of
the work (Phase 7), not left stale.

## 3. Current codebase facts (relevant to this work)

- Next.js **16.4.5** (package.json; CLAUDE.md still says 16.2.6), React 19, Tailwind v4
  CSS-first (`app/globals.css`, `@theme inline`, `@custom-variant dark (&:is(.dark *))`),
  shadcn style **`base-nova` on Base UI** (`@base-ui/react`, not Radix), `next-themes` class
  strategy, `lucide-react`, `sonner`. `components.json` aliases `@/components/ui` etc.
- Existing `components/ui/`: badge, button, dialog, dropdown-menu, input, label, select, sonner,
  tabs. **Missing** (needed): checkbox, switch, radio-group, toggle-group, popover, sheet/drawer,
  tooltip, table, separator, collapsible, (command/combobox).
- Fonts set in `app/layout.tsx` via `next/font/google` (Geist, Geist_Mono →
  `--font-geist-sans/mono`); `--font-heading` currently = sans.
- `PageShell` (`components/layout/page-shell.tsx`) wraps every sub-page; `AppHeader` holds bell +
  user menu. Both get replaced by the sidebar shell.
- Main dashboard data loading: `app/page.tsx` (parallel `getInventory`, `getUsableSpoolTypes`,
  `getActiveLendsForOwner`, `getMyGroups`, `getUnreadCount`, `getMyLends`,
  `getPropertyDefinitions`, `getMaterialUsage`) → `WarehouseDashboard` (client, 367 lines).
  Filter state is mirrored to URL params (`tab,q,type,minLeft,hideLent,props,status`).
- Biggest components to decompose: `warehouse-dashboard` (367), `borrows-panel` (362),
  `spool-form-dialog` (354), `property-admin-list` (350), `material-properties-section` (289).
- Already supported by backend: spool numbering `#01…` (`lib/filament.ts:186`, oldest-first),
  display name change (`authClient.updateUser`), group rename/rotate/remove/leave, weighing
  history + undo, drying hint, lend usage snapshots, usage/forecast math (`lib/consumption.ts`,
  `lib/usage-stats.ts`).
- **Not yet supported** (design shows it → new backend work, see Phase 6 "backend deltas"):
  sidebar counts loader, Overview "Recent activity" feed, "Used 30 d vs prev 30 d" delta & stock
  value roll-ups (partly derivable), review queue with duplicate detection (same name / colour
  ΔE), keyboard shortcuts, group-stock "Load more" pagination, per-type stock composition.
- Tests: vitest, pure-domain only (`lib/**/*.test.ts`). No component tests, no Storybook yet.
- CI (`.github/workflows/deploy.yml` `check` job): `tsc --noEmit`, oxlint, `npm test`, `next build`
  on PRs.
- `.claude/` (incl. `design/` and this plan) is committed on the trunk, so every worktree has it.

## 4. Guiding principles for the rebuild

1. **Component-first, bottom-up**: tokens → primitives (`ui/`) → design compounds → app shell →
   pages. Pages are assembled only from Storybook-verified components.
2. **Presentational / container split for everything new**: a presentational component takes
   plain data + callbacks (no `app/actions/*` imports, no `next/navigation` side effects) and
   gets stories; a thin container (server component page or small client wrapper) wires server
   actions. This keeps Storybook free of DB/`server-only` imports and avoids heavy module mocking.
3. **Restyle in place, don't fork**: `components/ui/*` primitives are restyled to the new look
   (this *is* the design-system change — the "never hand-edit ui/ for feature needs" rule still
   holds for feature-specific hacks). Old screens keep working (they just look partly new) until
   their page is migrated — the trunk stays shippable at every merge.
4. **Domain logic stays put**: no changes to `lib/filament.ts` rules, ownership checks, Zod
   validation, `requireUser()` discipline. New data needs = new read functions, same patterns.
5. **Tokens only, no hardcoded colours** (existing rule) — new tokens go into `globals.css`
   `:root` + `.dark` + `@theme inline`.
6. **Every component: light + dark + mobile story**, a11y addon clean.

## 5. Phased plan

Legend: 🔒 = serial (blocks later work) · 🔀 = can run in parallel worktrees

### Phase 0 — Branch & workflow setup 🔒 (small)

- 0.1 Keep `feature/redesign-spoolhouse-ui` as trunk; every unit of work = branch
  `redesign/<slug>` off the trunk → PR **into the trunk** (not `main`). Trunk → `main` only at
  the end (or at agreed milestones).
- 0.2 Decide CI for PRs targeting the trunk: extend `deploy.yml` `check` trigger to
  `pull_request` on `feature/**` (verify current trigger first) so typecheck/lint/test/build run.
- 0.3 Add a worktree helper (`scripts/worktree-new.sh`, see §6) — can be done right after
  Phase 2.

### Phase 1 — Design tokens & fonts 🔒 (small–medium)

Files: `app/globals.css`, `app/layout.tsx`.

- 1.1 Reconcile token values: compare `spoolhouse.css` hex vs current oklch (README says they
  match; verify each, adjust drift). Keep oklch format.
- 1.2 Add new tokens to `:root`/`.dark` + `@theme inline`: `--ink` (`--color-ink`), `--scrim`,
  `--swatch-ring`, `--sidebar-active(-foreground)` (or map to existing `--sidebar-accent*`).
- 1.3 Load **Barlow Condensed 600** via `next/font/google` → `--font-display`; set
  `--font-heading` to it (or add `font-display` utility). Keep Geist/Geist Mono.
- 1.4 Typography utilities (`@utility` in globals.css): `kicker`, `display-h1` (60/.88
  uppercase), `display-h2`, `display-name` (`.nm`), `num`/`num-big` (tabular lining nums),
  `fine`. Radius scale: confirm `--radius` (dialogs 8px) and add explicit small radii if needed.
- 1.5 Utilities for `meter` mask, `hatch` (current-month bar), `ruler`.
- Validate: `npx tsc --noEmit && npm run build`; screenshot existing `/` light+dark — nothing
  broken, fonts load.

### Phase 2 — Storybook 🔒 (medium)

- 2.1 Install Storybook (latest stable, pin exact version) with framework
  **`@storybook/nextjs-vite`** (Vite-based, supports App Router + `next/font` + `next/image`
  mocks; faster than the webpack framework). Addons: `@storybook/addon-themes` (class strategy
  → toggles `.dark` on `<html>` exactly like next-themes), `@storybook/addon-a11y`,
  docs/autodocs. Viewports: desktop 1440, mobile 390 (matches the boards).
- 2.2 `.storybook/preview.tsx`: import `app/globals.css`, apply font CSS variables (same
  `next/font` setup as layout — extract fonts into `lib/fonts.ts` so both share it), wrap in
  `ThemeProvider`-equivalent decorator, `Toaster` decorator.
- 2.3 Tailwind v4 in Storybook: via the existing `@tailwindcss/postcss` (Vite picks up
  `postcss.config`); if not, add `@tailwindcss/vite` in `viteFinal`. Verify classes from
  `components/**` are scanned.
- 2.4 Conventions: stories colocated (`button.stories.tsx` next to `button.tsx`), title
  `UI/Button`, `Design/SpoolTile`, `Shell/AppSidebar`, `Pages/Overview`. Each component:
  Default, all variants, states (hover/focus/disabled/error), Dark, Mobile where relevant.
- 2.5 Mocking strategy: presentational components need none. For the few containers we do want
  in Storybook, use Storybook's module mocking for `@/app/actions/*` and `next/navigation`
  (`nextjs-vite` provides navigation mocks). Never import `lib/db` in a story.
- 2.6 Scripts: `storybook` (port 6006, overridable via `STORYBOOK_PORT`), `build-storybook`.
  Add `storybook-static/` to `.gitignore`. Include `*.stories.tsx` + `.storybook/` in tsconfig,
  oxlint/eslint (eslint-plugin-storybook optional).
- 2.7 CI: add `build-storybook` to the `check` job (catches broken stories). Optional later:
  `@storybook/addon-vitest` to run stories as tests (check compatibility with vitest 5 first).
- 2.8 Smoke: stories for the *existing* Button/Badge/Input/Dialog so the setup is proven before
  restyling.
- Validate: `npm run storybook` renders, theme toggle flips light/dark, `npm run build-storybook`
  succeeds, `npm run build` unaffected.

> After Phase 2 merges into the trunk → **parallel worktrees start**.

### Phase 3 — Primitives (`components/ui/`) 🔀 (medium)

Add missing ones with `npx shadcn@latest add <name>` (style base-nova → Base UI), then restyle to
the design. Three independent lanes:

- **3A Actions & labels**: `Button` (variants/sizes above + `Kbd` slot), `Badge` (tag variants),
  `Kbd`, `Tooltip`, `DropdownMenu` restyle, sonner toast theme (`.toast`, `.toast.err`; bottom
  right desktop / top mobile).
- **3B Forms**: `Input` (unit adornment, numeric right-aligned mono, focus ring, error),
  `Label` + new `Field` (label row with right-side action e.g. "+ Request new", help, error),
  `Select`, `Checkbox`, `Switch`, `RadioGroup` (+ card variant `.radio`), `ToggleGroup`
  (segmented `.seg` with counts), `Textarea` if needed.
- **3C Overlays & structure**: `Dialog` (header w/ 2px ink rule, body, muted footer), `Popover`,
  `Sheet` (bottom sheet + side drawer), combobox/`Command` list (`.pop/.opt`), `Table`,
  `Separator`, `Tabs` (only if still used), `Collapsible`.
- Each lane: stories for every variant + dark + a11y check. Touches only its own `ui/*` files →
  low merge conflict risk (`package.json`/lockfile conflicts: rebase and re-run `npm install`).

### Phase 4 — Design compounds 🔀 (medium–large)

Cross-cutting visual building blocks (→ `components/common/`, since the design uses them in
2+ features by definition) and domain pieces (→ owning feature folder). Lanes:

- **4A Layout atoms** (`common/`): `PageHeader` (kicker/breadcrumb, display title, meta line,
  actions, 2px rule), `SectionHeader` (`.sec`), `ReadoutStrip` + `Readout`, `EmptyState`
  (incl. onboarding variant with 3 steps), `Alert`/`Note`, `Inset`, `ResultBox`, `KeyValueRow`,
  `InitialsAvatar` (+ stacked avatars), `StatusBadge` (approved/pending/rejected/imported/
  unverified).
- **4B Inventory atoms**: `Swatch`, `Meter`, `WeightDisplay` (`formatWeight` + unit small),
  `SpoolTile` (states: normal, low, full, lent·X, req·X, dry?, selected, borrowed),
  `AddSpoolTile`, `MaterialBlock` (inventory row: swatch, name, type, mfr, total, count,
  forecast, tiles), `ReweighPopover`/`ReweighSheet` (presentational; live "−81 g since last").
- **4C Data viz**: `UsageBarChart` (12 bars, hatched current month, hover value, grams/cost
  toggle), `StockCompositionBar` (by type %), `RunwayTable` rows, `ActivityItem` (time · text ·
  tag). Follow the dataviz skill guidance when building charts.
- **4D Catalog & admin atoms**: `ManufacturerHeader`, `CatalogRow` (material/spool-type variants,
  "In your stock · 3", pending/rejected affordances), `FilterPanel` (desktop expand-under-toolbar)
  + `FilterSheet` (mobile), `DuplicateCandidate` row, `ImportManufacturerRow` (status: imported /
  never / failed).
- **4E Borrow & group atoms**: `LendRequestCard` (approve/decline), `LendLine` (Out →/In ←,
  since, −g so far, action), `LendHistoryTable`, `GroupCard`, `MemberRow`, `ShareModePicker`
  (radio cards + preview count), `InviteCodeBox` (copy/rotate), `NotificationRow`,
  `BorrowRequestDialog` (presentational).
- Each compound: stories fed by realistic fixtures. Put shared fixtures in
  `stories/fixtures/*.ts` built from the real types (`SpoolView`, `MaterialInventory`, …) so they
  stay type-checked against `lib/filament.ts`.

### Phase 5 — App shell 🔒 (medium) — merge point

- 5.1 `AppSidebar` (expanded/collapsed, collapse state persisted in a cookie so SSR renders the
  right width; group sub-items; admin section only for admins; accent pill vs muted count rule;
  user menu with theme switch).
- 5.2 Mobile: `MobileTopBar`, `BottomNav` (5 items), `NavDrawer` (Sheet).
- 5.3 Route groups: `app/(app)/layout.tsx` (sidebar shell, `requireUser()`) holding all signed-in
  pages; `app/(auth)/…` for login/signup/forgot/reset (no shell); `/groups/join/[code]` decide
  shell vs standalone (design shows standalone card). Moving pages into route groups does **not**
  change URLs.
- 5.4 Backend: `getNavCounts()` (inventory count, open borrow requests for you, per-group shared
  counts, unread notifications, pending materials/spool types for admins) — one cached-per-request
  loader in the layout (`React.cache`). Reuse existing queries where possible.
- 5.5 New `PageShell` replacement = layout + `PageHeader` (width `max-w-[1280px]`, paddings
  28/40 desktop). Keep the old `PageShell` export temporarily as a thin adapter so un-migrated
  pages still render inside the new shell.
- Validate: every existing route renders inside the shell (light/dark/mobile), auth pages
  without it; `next build` green.

### Phase 6 — Pages 🔀 (large) — one lane per worktree

Each page: server component fetches → presentational page component (with a `Pages/*` story
using fixtures) → wire actions → remove the old component(s) it replaces. Keep URL params and
all behaviours (CLAUDE.md domain rules) intact.

- **6A Overview + Inventory + spool flows**: `/` Overview (new), `/inventory` (move the
  dashboard's inventory tab, filters, URL state), spool add/edit dialog + mobile sheet restyle
  (decompose `spool-form-dialog`), re-weigh popover on tile click (`setMeasuredWeight`),
  "Dry?" → `markDried`. Backend deltas: Overview roll-ups (used 30 d + Δ, stock value, running
  low w/ forecast, needs drying list), **recent activity** feed (union of recent
  `spool_weighings` + lend events — new read fn, no schema change).
- **6B Material detail + catalog + admin catalog**: `/materials/[id]` (replaces
  `material-dialog`; dashboard + catalog rows link to it), `/materials` + `/spool-types`
  restyle with filter panel & side-panel request forms, `/admin/materials` + `/admin/spool-types`
  table view, **review queue** (new route, e.g. `/admin/materials/review`), property dialog.
  Backend deltas: duplicate candidates (same name, colour distance ΔE from hex) — new pure fn in
  `lib/` with vitest tests.
- **6C Borrows + notifications + groups**: `/borrows` (decompose `borrows-panel`), notifications
  restyle + `BorrowRequestDialog`, `/groups`, `/groups/[id]` with Stock (move `group-stock` here
  from dashboard tabs) + Settings, join page. Backend deltas: group-stock pagination
  ("Load more"), if needed.
- **6D Stats + account + admin misc + auth**: `/stats` (readouts, chart toggle, by material,
  by type), `/account` (name, password w/ length counter, API tokens), `/admin/users`,
  `/admin/properties`, `/admin/import` (progress/error states), auth pages, 404 page.
- **6E (optional, later)** Keyboard shortcuts (`N` add spool, `R` request, `/` search, `↵` save,
  review queue `R/E/J/A`) — one small `useHotkeys` hook in `lib/` + `Kbd` hints.

### Phase 7 — Cleanup, QA, docs 🔒 (medium)

- Delete dead code: `warehouse-dashboard` tabs, `material-dialog`, `borrows-dialog`, old
  `PageShell` adapter, `app-header`, unused `ui/tabs` etc. (`ecc:refactor-clean` helps).
- Visual QA vs boards: each page light/dark/390px; compare side by side with the mockup in a
  browser (chrome-devtools MCP screenshots).
- a11y pass (focus rings, sidebar keyboard nav, dialog focus traps, colour contrast of `--ink`
  in dark, `aria-current` on nav).
- Rewrite CLAUDE.md sections (Architecture, Sub-page layout, Component folders table,
  Groups stock location, Storybook commands) + `docs/` if affected.
- Merge trunk → `main` via PR; deploy.

## 6. Parallel work with git worktrees

Start only after Phase 2 is merged into the trunk.

```sh
# from the main checkout
git fetch && git switch feature/redesign-spoolhouse-ui && git pull
git worktree add ../spoolhouse-wt/<slug> -b redesign/<slug> feature/redesign-spoolhouse-ui
```

**Gotchas (must be handled by the helper script):**

1. `.claude/` (design + plan) is committed — nothing to symlink.
2. **`node_modules`** per worktree: `npm ci` in each (don't symlink — lockfile may diverge).
3. **`.env`** is gitignored: copy it.
4. **Ports**: Next dev 3000 → `npm run dev -- -p 30NN`; Storybook 6006 → `-p 60NN`.
5. **Local DB**: worktrees share the main checkout's PGlite DB (port 5433). The user treats it as disposable, and the redesign adds no migrations unless a lane says so explicitly.
6. **Merge hotspots** — single owner per file during a phase: `app/globals.css` (Phase 1 only;
   later token additions go through a tiny dedicated PR), `components/ui/*` (owned by its 3x
   lane), `package.json`/lockfile (rebase + `npm install`), CLAUDE.md (Phase 7 only; lanes leave
   notes in their PR description instead), sidebar nav config (Phase 5).
7. Clean up: `git worktree remove ../spoolhouse-wt/<slug>` after the PR merges.

Suggested lane assignment: Phase 3 → 3 worktrees (3A/3B/3C); Phase 4 → up to 5 (4A–4E; 4B
depends on 3B for the re-weigh input, 4D on 3B/3C — start with A, C, E); Phase 6 → 4 worktrees
(6A–6D).

## 7. Patterns to mirror

| Category | Source | Pattern |
|---|---|---|
| Naming | `components/` (CLAUDE.md table) | kebab-case files, feature folders one level deep, `common/` for 2+ features |
| Primitives | `components/ui/button.tsx`, `components.json` | cva variants + `cn()`, Base UI primitives, add via shadcn CLI |
| Data → UI | `app/page.tsx` → `components/dashboard/warehouse-dashboard.tsx` | server component fetches in `Promise.all`, passes plain props to client UI |
| URL state | `components/dashboard/inventory-filter.tsx`, `app/page.tsx` | filters mirrored via `history.replaceState`, parsed server-side |
| Errors | client toasts with static messages (`sonner`) | server-action errors are masked in prod → static, cause-naming toast text |
| Auth | `lib/auth-session.ts` | `requireUser()`/`requireAdmin()` first in every page/action |
| Domain math | `lib/filament.ts`, `lib/consumption.ts` | pure functions + `*.test.ts` (vitest) for any new derivation (activity feed shaping, duplicate detection, roll-ups) |
| Theming | `app/globals.css`, `components/layout/theme-provider.tsx` | oklch tokens in `:root`/`.dark`, next-themes class strategy |

## 8. Decisions (confirmed by user, 2026-11-10)

1. **Backend scope**: nav counts, Overview roll-ups and the recent-activity feed are in scope
   (Phases 5/6A). Review queue (with duplicate detection) and keyboard shortcuts come late in
   Phase 6.
2. **Design files** live in `.claude/design/`, committed on the trunk.
3. **New routes** `/inventory`, `/borrows`, `/materials/[id]` (+ review queue) approved; old
   `/?tab=…` links get redirects.
4. **One big merge** of `feature/redesign-spoolhouse-ui` → `main` at the very end. Sub-branches
   `redesign/<slug>` merge into the trunk.
5. **Component unit tests are required** alongside Storybook: Vitest + jsdom + Testing Library,
   reusing stories via `composeStories` (portable stories) so a story is also a test fixture.
   Storybook's browser-mode runner (`@storybook/addon-vitest` + Playwright) is not used, since
   CI runs in a slim Node container without browsers.
6. The user does no work on the old UI meanwhile; the local DB is disposable.

## 9. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Storybook + Next 16.4 / Tailwind v4 / Base UI incompatibility | Medium | `nextjs-vite` framework; prove with smoke stories in Phase 2 before anything depends on it; fallback `@storybook/react-vite` + manual next mocks |
| Server-only imports leaking into stories | High if unmanaged | presentational/container split (principle 2); never import `lib/db`/`app/actions` from presentational files |
| Merge conflicts across worktrees | Medium | file ownership per phase (§6.6), small PRs into trunk, rebase often |
| Shared PGlite DB corrupted by a lane's migration | Medium | separate `DEV_DB_PORT`/`DATABASE_PATH` for lanes with migrations |
| Long-lived trunk drifts from `main` (dependabot etc.) | Medium | merge `main` → trunk weekly |
| IA change breaks bookmarked/shared URLs (`/?tab=…&q=…`) | Medium | redirects in `app/page.tsx` / `proxy.ts` for old params |
| Behaviour regressions while decomposing big components (lend lifecycle, undo weighing, URL filters) | Medium | keep server actions untouched; checklist of CLAUDE.md domain rules per page PR; manual flow test per page |
| Barlow Condensed uppercase hurting readability / i18n | Low | only for display elements as specified |
| Dark-mode `--ink` contrast insufficient | Low | a11y addon + contrast check in Phase 1 |

## 10. Validation (every PR into the trunk)

```sh
npx tsc --noEmit
npm run lint:oxlint
npm test
npm run build-storybook   # from Phase 2 on
npm run build
```

Plus: story for every new/changed component (light, dark, mobile), and for page PRs a manual run
through the affected flows on `npm run dev` in light + dark + 390px.

## 11. Acceptance (whole redesign)

- [ ] All boards in `.claude/design/canvas.json` implemented (light + dark + mobile where designed)
- [ ] Every UI component has stories; Storybook builds in CI
- [ ] No hardcoded colours; tokens match `spoolhouse.css`
- [ ] All existing behaviours preserved (CLAUDE.md domain rules), no auth/ownership regressions
- [ ] Dead components removed, CLAUDE.md updated
- [ ] Trunk merged to `main`, deployed, health check green
