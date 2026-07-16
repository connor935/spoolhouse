// Seed the global materials & spool-type catalogs from SpoolmanDB-Community
// (https://github.com/Icezaza2543/SpoolmanDB-Community, MIT).
//
// Usage:
//   npm run db:import -- --manufacturer spectrum [--manufacturer polymaker] \
//                        [--type PETG,PLA] [--dry-run]
//
// Consumes the clean SOURCE files (filaments/<manufacturer>.json), not the
// compiled output (which expands color×diameter×weight×packaging into 50k+
// redundant rows). One product entry -> one material per distinct color, after
// merging near-duplicate product lines (see normalizeTokens).
//
// INSERT-ONLY / idempotent: re-running never overwrites or deletes existing
// rows. Rows carry a stable `externalKey`; a re-import skips known keys,
// "claims" matching manual rows (sets only externalKey + backfills NULL extra
// columns), or inserts new approved rows. The extra SpoolmanDB data (density,
// diameters, temps) is stored on materials data-only for now (no UI yet).
//
// Known limitation: if upstream RENAMES a product/color its externalKey
// changes, so the old row lingers and a new row inserts. Delete the stale one
// via /admin/materials.
//
// Run under Node 24 (better-sqlite3 native module): the npm script uses tsx;
// invoke via `fnm exec --using=v24.18.0 npm run db:import -- ...` if your shell
// defaults to another Node.
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../lib/db';
import { materials, spoolTypes } from '../lib/db/schema';
import { FILAMENT_TYPES } from '../lib/filament';

const RAW_BASE =
  'https://raw.githubusercontent.com/Icezaza2543/SpoolmanDB-Community/main/filaments';
const CONTENTS_API =
  'https://api.github.com/repos/Icezaza2543/SpoolmanDB-Community/contents/filaments';

// --- SpoolmanDB source shapes (only the fields we consume) ---
type SourceWeight = {
  weight: number;
  spool_weight?: number;
  spool_type?: string;
  is_refill?: boolean;
};
type SourceColor = { name: string; hex?: string; hexes?: string[] };
type SourceProduct = {
  name: string;
  material: string;
  density?: number;
  weights?: SourceWeight[];
  diameters?: number[];
  colors?: SourceColor[];
  extruder_temp?: number;
  extruder_temp_range?: [number, number];
  bed_temp?: number;
  bed_temp_range?: [number, number];
};
type SourceFile = { manufacturer: string; filaments: SourceProduct[] };

// --- Normalization ---

// Material-code tokens dropped from product-line names so near-duplicates
// ("PET-G Premium PETG" vs "PETG Premium") collapse to the same line.
const MATERIAL_TOKENS = new Set([
  'petg',
  'pla',
  'abs',
  'asa',
  'tpu',
  'pctg',
  'pa',
  'nylon',
  'pc',
  'pva',
  'hips',
  'pet',
]);

// Map a SpoolmanDB material code to one of the app's FILAMENT_TYPES.
function mapFilamentType(code: string): string {
  const c = code.toUpperCase();
  if (c.startsWith('TPU') || c.startsWith('TPE')) return 'TPU';
  if (c.startsWith('PA') || c.includes('NYLON')) return 'Nylon';
  if (c.startsWith('PLA')) return 'PLA';
  if (c.startsWith('PETG') || c === 'PET-G' || c === 'PET G') return 'PETG';
  if (c.startsWith('ABS')) return 'ABS';
  if (c.startsWith('ASA')) return 'ASA';
  if (c.startsWith('PVA')) return 'PVA';
  if (c.startsWith('HIPS')) return 'HIPS';
  if (c === 'PC' || c.startsWith('POLYCARB')) return 'PC';
  const exact = FILAMENT_TYPES.find((t) => t.toUpperCase() === c);
  return exact ?? 'Other';
}

// Normalized token list identifying a product LINE (color-independent).
// Equal lists -> same line (merged). Not subset: "Premium" vs "Premium High
// Speed" stay distinct.
function normalizeTokens(name: string, material: string): string[] {
  let s = name.replace(/\{color_name\}/gi, ' ').toLowerCase();
  s = s.replace(/pet[-\s]?g/g, 'petg');
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  const drop = new Set([...MATERIAL_TOKENS, material.toLowerCase()]);
  const toks = s
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !drop.has(t))
    .map((t) => (t === 'matte' ? 'matt' : t));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of toks) if (!seen.has(t)) (seen.add(t), out.push(t));
  return out;
}

// Human-facing product-line label in original casing (material words removed).
// "PETG Premium High Speed {color_name}" -> "Premium High Speed"; "PLA
// {color_name}" -> "".
function productLabel(name: string, material: string): string {
  let s = name.replace(/\{color_name\}/gi, ' ');
  s = s.replace(/\bpet[\s-]?g\b/gi, ' ');
  for (const w of [...MATERIAL_TOKENS, material]) {
    if (w === 'pet') continue; // handled by the pet-g rule; avoids nuking "Pet"
    s = s.replace(
      new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'),
      ' '
    );
  }
  return s.replace(/\s+/g, ' ').trim();
}

function normalizeHex(color: SourceColor): string | null {
  let h = color.hex ?? (Array.isArray(color.hexes) ? color.hexes[0] : undefined);
  if (!h) return null;
  h = String(h).toLowerCase().replace(/^#/, '');
  return /^[0-9a-f]{6}$/.test(h) ? h : null;
}

// Loose name key for claiming a pre-existing manual row.
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function manufacturerSlug(m: string): string {
  return m.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function fmtKg(grams: number): string {
  return String(grams / 1000);
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Candidate building ---

type MaterialCandidate = {
  externalKey: string;
  manufacturer: string;
  name: string;
  filamentType: string;
  color: string; // "#rrggbb"
  hex: string; // normalized, no "#", for claim matching
  densityGCm3: number | null;
  diametersMm: string | null;
  extruderTempMinC: number | null;
  extruderTempMaxC: number | null;
  bedTempMinC: number | null;
  bedTempMaxC: number | null;
};

type SpoolTypeCandidate = {
  externalKey: string;
  manufacturer: string;
  name: string;
  emptyWeightGrams: number;
};

type ExtraData = Pick<
  MaterialCandidate,
  | 'densityGCm3'
  | 'diametersMm'
  | 'extruderTempMinC'
  | 'extruderTempMaxC'
  | 'bedTempMinC'
  | 'bedTempMaxC'
>;

function extractExtra(p: SourceProduct): ExtraData {
  const ex = p.extruder_temp_range;
  const bed = p.bed_temp_range;
  return {
    densityGCm3: typeof p.density === 'number' ? p.density : null,
    diametersMm: p.diameters?.length ? p.diameters.map(String).join(',') : null,
    extruderTempMinC: ex ? ex[0] : (p.extruder_temp ?? null),
    extruderTempMaxC: ex ? ex[1] : (p.extruder_temp ?? null),
    bedTempMinC: bed ? bed[0] : (p.bed_temp ?? null),
    bedTempMaxC: bed ? bed[1] : (p.bed_temp ?? null),
  };
}

function buildCandidates(
  file: SourceFile,
  typeFilter: Set<string> | null
): { mats: MaterialCandidate[]; spools: SpoolTypeCandidate[] } {
  const manufacturer = file.manufacturer;
  const mfrSlug = manufacturerSlug(manufacturer);

  // Group products into lines: key = filamentType + normalized tokens. Keep
  // the shortest-named product as the representative (cleanest label).
  type Line = { rep: SourceProduct; type: string; lineKey: string; members: SourceProduct[] };
  const lines = new Map<string, Line>();
  for (const p of file.filaments) {
    const type = mapFilamentType(p.material);
    if (typeFilter && !typeFilter.has(type.toUpperCase())) continue;
    const tokens = normalizeTokens(p.name, p.material);
    const lineKey = `${type.toLowerCase()}-${tokens.join('-')}`;
    const groupKey = lineKey;
    const existing = lines.get(groupKey);
    if (!existing) {
      lines.set(groupKey, { rep: p, type, lineKey, members: [p] });
    } else {
      existing.members.push(p);
      if (p.name.length < existing.rep.name.length) existing.rep = p;
    }
  }

  const mats: MaterialCandidate[] = [];
  const seenMatKey = new Set<string>();
  for (const line of lines.values()) {
    const label = productLabel(line.rep.name, line.rep.material);
    // Colors: union across merged members, deduped by normalized color NAME
    // (not exact hex — the same named color drifts a few hex points between
    // a manufacturer's product lines; that's redundancy, not a real variant).
    // First occurrence wins its hex (kept only as a swatch).
    const byColor = new Map<string, { color: SourceColor; hex: string; extra: ExtraData }>();
    for (const p of line.members) {
      const extra = extractExtra(p);
      for (const c of p.colors ?? []) {
        const hex = normalizeHex(c);
        if (!hex) continue;
        const slug = normName(c.name).replace(/\s+/g, '-');
        if (!slug || byColor.has(slug)) continue;
        byColor.set(slug, { color: c, hex, extra });
      }
    }
    for (const [slug, { color, hex, extra }] of byColor) {
      const externalKey = `spoolmandb:${mfrSlug}:${line.lineKey}:${slug}`;
      if (seenMatKey.has(externalKey)) continue;
      seenMatKey.add(externalKey);
      const name = [label, color.name].filter(Boolean).join(' ').trim();
      mats.push({
        externalKey,
        manufacturer,
        name: name || color.name,
        filamentType: line.type,
        color: `#${hex}`,
        hex,
        ...extra,
      });
    }
  }

  // Spool types from every weight in the file (skip refills / no spool_weight).
  const spools: SpoolTypeCandidate[] = [];
  const seenSpoolKey = new Set<string>();
  for (const p of file.filaments) {
    for (const w of p.weights ?? []) {
      if (w.is_refill || w.spool_type === 'refill') continue;
      if (typeof w.spool_weight !== 'number') continue;
      const st = w.spool_type || 'spool';
      const externalKey = `spoolmandb:${mfrSlug}:spool:${st}:${w.spool_weight}`;
      if (seenSpoolKey.has(externalKey)) continue;
      seenSpoolKey.add(externalKey);
      spools.push({
        externalKey,
        manufacturer,
        name: `${titleCase(st)} ${fmtKg(w.weight)} kg`,
        emptyWeightGrams: w.spool_weight,
      });
    }
  }

  return { mats, spools };
}

// --- DB upsert (insert-only + claim + NULL-backfill) ---

// Build an update object of only the extra columns that are NULL on `row` and
// present on the candidate — never overwrites an existing value.
function nullBackfill<T extends Record<string, unknown>>(
  row: Record<string, unknown>,
  extra: T
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (v !== null && v !== undefined && (row[k] === null || row[k] === undefined))
      out[k] = v;
  }
  return out as Partial<T>;
}

async function upsertMaterials(cands: MaterialCandidate[], dryRun: boolean) {
  const existing = await db.select().from(materials);
  const byKey = new Map<string, (typeof existing)[number]>();
  const claimable: typeof existing = [];
  for (const m of existing) {
    if (m.externalKey) byKey.set(m.externalKey, m);
    else claimable.push(m);
  }
  const usedClaim = new Set<string>();
  let inserted = 0,
    claimed = 0,
    skipped = 0,
    enriched = 0;

  for (const c of cands) {
    const extra: ExtraData = {
      densityGCm3: c.densityGCm3,
      diametersMm: c.diametersMm,
      extruderTempMinC: c.extruderTempMinC,
      extruderTempMaxC: c.extruderTempMaxC,
      bedTempMinC: c.bedTempMinC,
      bedTempMaxC: c.bedTempMaxC,
    };

    const known = byKey.get(c.externalKey);
    if (known) {
      const patch = nullBackfill(known, extra);
      if (Object.keys(patch).length > 0) {
        enriched++;
        if (!dryRun)
          await db.update(materials).set(patch).where(eq(materials.id, known.id));
      }
      skipped++;
      continue;
    }

    // Claim a pre-existing manual row by manufacturer + type + name. The name
    // already embeds the color name, so this is specific enough — and it's
    // hex-independent, so a manual row whose swatch differs slightly from the
    // imported one is still claimed (rather than duplicated).
    const match = claimable.find(
      (m) =>
        !usedClaim.has(m.id) &&
        m.manufacturer.toLowerCase() === c.manufacturer.toLowerCase() &&
        m.filamentType === c.filamentType &&
        normName(m.name) === normName(c.name)
    );
    if (match) {
      usedClaim.add(match.id);
      claimed++;
      const patch = { externalKey: c.externalKey, ...nullBackfill(match, extra) };
      if (!dryRun)
        await db.update(materials).set(patch).where(eq(materials.id, match.id));
    } else {
      inserted++;
      if (!dryRun)
        await db.insert(materials).values({
          manufacturer: c.manufacturer,
          name: c.name,
          filamentType: c.filamentType,
          color: c.color,
          status: 'approved',
          externalKey: c.externalKey,
          ...extra,
        });
    }
    byKey.set(c.externalKey, {} as (typeof existing)[number]); // avoid dup within run
  }
  return { inserted, claimed, skipped, enriched };
}

async function upsertSpoolTypes(cands: SpoolTypeCandidate[], dryRun: boolean) {
  const existing = await db.select().from(spoolTypes);
  const byKey = new Map<string, (typeof existing)[number]>();
  const claimable: typeof existing = [];
  for (const t of existing) {
    if (t.externalKey) byKey.set(t.externalKey, t);
    else claimable.push(t);
  }
  const usedClaim = new Set<string>();
  let inserted = 0,
    claimed = 0,
    skipped = 0;

  for (const c of cands) {
    if (byKey.has(c.externalKey)) {
      skipped++;
      continue;
    }
    const match = claimable.find(
      (t) =>
        !usedClaim.has(t.id) &&
        t.manufacturer.toLowerCase() === c.manufacturer.toLowerCase() &&
        t.emptyWeightGrams === c.emptyWeightGrams
    );
    if (match) {
      usedClaim.add(match.id);
      claimed++;
      if (!dryRun)
        await db
          .update(spoolTypes)
          .set({ externalKey: c.externalKey })
          .where(eq(spoolTypes.id, match.id));
    } else {
      inserted++;
      if (!dryRun)
        await db.insert(spoolTypes).values({
          manufacturer: c.manufacturer,
          name: c.name,
          emptyWeightGrams: c.emptyWeightGrams,
          status: 'approved',
          externalKey: c.externalKey,
        });
    }
    byKey.set(c.externalKey, {} as (typeof existing)[number]);
  }
  return { inserted, claimed, skipped };
}

// --- CLI ---

function parseArgs(argv: string[]) {
  const manufacturers: string[] = [];
  const types: string[] = [];
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--manufacturer' || a === '-m') manufacturers.push(argv[++i]);
    else if (a === '--type' || a === '-t')
      types.push(...argv[++i].split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--dry-run') dryRun = true;
    else console.warn(`Ignoring unknown argument: ${a}`);
  }
  return { manufacturers, types, dryRun };
}

async function listManufacturers(): Promise<string[]> {
  const res = await fetch(CONTENTS_API, {
    headers: { 'User-Agent': 'spoolhouse-import' },
  });
  if (!res.ok) return [];
  const items = (await res.json()) as { name: string }[];
  return items
    .filter((i) => i.name.endsWith('.json'))
    .map((i) => i.name.replace(/\.json$/, ''));
}

async function main() {
  const { manufacturers, types, dryRun } = parseArgs(process.argv.slice(2));
  if (manufacturers.length === 0) {
    console.error(
      'Usage: npm run db:import -- --manufacturer <slug> [--manufacturer …] [--type PETG,PLA] [--dry-run]'
    );
    const available = await listManufacturers();
    if (available.length)
      console.error(`\nAvailable manufacturers (${available.length}):\n  ${available.join(', ')}`);
    process.exit(1);
  }
  const typeFilter = types.length
    ? new Set(types.map((t) => t.toUpperCase()))
    : null;

  console.log(
    `SpoolmanDB import${dryRun ? ' (dry run — no writes)' : ''}\n` +
      `  manufacturers: ${manufacturers.join(', ')}\n` +
      `  type filter:   ${typeFilter ? [...typeFilter].join(', ') : '(all)'}\n`
  );

  const totals = { mInserted: 0, mClaimed: 0, mSkipped: 0, mEnriched: 0, sInserted: 0, sClaimed: 0, sSkipped: 0 };

  for (const slug of manufacturers) {
    const url = `${RAW_BASE}/${slug}.json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'spoolhouse-import' } });
    if (res.status === 404) {
      console.error(`✗ ${slug}: not found (${url}).`);
      const available = await listManufacturers();
      const near = available.filter((a) => a.includes(slug) || slug.includes(a));
      if (near.length) console.error(`  Did you mean: ${near.join(', ')}?`);
      else if (available.length) console.error(`  Available: ${available.join(', ')}`);
      continue;
    }
    if (!res.ok) {
      console.error(`✗ ${slug}: fetch failed (HTTP ${res.status}).`);
      continue;
    }
    const file = (await res.json()) as SourceFile;
    const { mats, spools } = buildCandidates(file, typeFilter);

    if (dryRun) {
      console.log(`— ${file.manufacturer}: ${mats.length} material candidates, ${spools.length} spool-type candidates`);
      const sample = mats.slice(0, 8).map((m) => `${m.name} [${m.filamentType} ${m.color}]`);
      if (sample.length) console.log(`  e.g. ${sample.join(' · ')}`);
      const stSample = spools.slice(0, 6).map((s) => `${s.name} (${s.emptyWeightGrams} g)`);
      if (stSample.length) console.log(`  spool types e.g. ${stSample.join(' · ')}`);
    }

    const m = await upsertMaterials(mats, dryRun);
    const s = await upsertSpoolTypes(spools, dryRun);
    console.log(
      `✓ ${file.manufacturer}: materials ${m.inserted} inserted / ${m.claimed} claimed / ${m.skipped} skipped` +
        (m.enriched ? ` (${m.enriched} enriched)` : '') +
        ` · spool types ${s.inserted} inserted / ${s.claimed} claimed / ${s.skipped} skipped`
    );
    totals.mInserted += m.inserted;
    totals.mClaimed += m.claimed;
    totals.mSkipped += m.skipped;
    totals.mEnriched += m.enriched;
    totals.sInserted += s.inserted;
    totals.sClaimed += s.claimed;
    totals.sSkipped += s.skipped;
  }

  console.log(
    `\nTotal: materials +${totals.mInserted} inserted, ${totals.mClaimed} claimed, ${totals.mSkipped} skipped` +
      (totals.mEnriched ? ` (${totals.mEnriched} enriched)` : '') +
      `\n       spool types +${totals.sInserted} inserted, ${totals.sClaimed} claimed, ${totals.sSkipped} skipped` +
      (dryRun ? '\n(dry run — nothing written)' : '')
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
