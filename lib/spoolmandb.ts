// Seeding the global materials & spool-type catalogs from SpoolmanDB-Community
// (https://github.com/Icezaza2543/SpoolmanDB-Community, MIT).
//
// Consumes the clean SOURCE files (filaments/<manufacturer>.json), not the
// compiled output (which expands color×diameter×weight×packaging into 50k+
// redundant rows). One product entry -> one material per distinct color, after
// merging near-duplicate product lines (see normalizeTokens).
//
// INSERT-ONLY / idempotent: re-running never overwrites or deletes existing
// rows. Rows carry a stable `externalKey`; a re-import skips known keys,
// "claims" matching manual rows (sets only externalKey), or inserts new
// approved rows. The extra SpoolmanDB data (density, diameters, temps) is
// seeded into the generic `material_properties` table as verified values —
// insert-only (a missing material×property pair), so re-crawls never clobber
// a user's or admin's edits. Its four property definitions must already exist
// (seeded by drizzle/0001); importing throws if they're missing.
//
// Known limitation: if upstream RENAMES a product/color its externalKey
// changes, so the old row lingers and a new row inserts. Delete the stale one
// via /admin/materials.
//
// Deliberately NOT marked 'server-only': scripts/import-spoolmandb.ts runs this
// under tsx, outside Next's bundler. Callers are that CLI and the admin import
// action (app/actions/spoolmandb.ts).
import { eq } from 'drizzle-orm';
import { db } from './db';
import {
  materialProperties,
  materials,
  properties,
  spoolTypes,
} from './db/schema';
import { FILAMENT_TYPES } from './filament';
import {
  isPropertyValueType,
  normalizePropertyValue,
  type PropertyValueType,
} from './property-value';

// Property definition keys the importer seeds (must match drizzle/0001).
const PROPERTY_KEYS = [
  'density',
  'diameter',
  'extruder_temp',
  'bed_temp',
] as const;
type PropertyKey = (typeof PROPERTY_KEYS)[number];
// Formatted, unit-less values keyed by property (unit lives on the definition).
type ExtraProps = Partial<Record<PropertyKey, string>>;

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
export type SourceFile = { manufacturer: string; filaments: SourceProduct[] };

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
  for (const t of toks) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
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
      new RegExp(
        '\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b',
        'gi'
      ),
      ' '
    );
  }
  return s.replace(/\s+/g, ' ').trim();
}

function normalizeHex(color: SourceColor): string | null {
  let h =
    color.hex ?? (Array.isArray(color.hexes) ? color.hexes[0] : undefined);
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
  props: ExtraProps;
};

type SpoolTypeCandidate = {
  externalKey: string;
  manufacturer: string;
  name: string;
  emptyWeightGrams: number;
};

// Collapse a temp range/scalar to the same unit-less string form the migration
// produced: single number when min==max or only one bound; en-dash range
// otherwise (e.g. "190–220").
function formatTemp(
  range: [number, number] | undefined,
  scalar: number | undefined
): string | undefined {
  if (range) {
    const [min, max] = range;
    return min === max ? String(min) : `${min}–${max}`;
  }
  return typeof scalar === 'number' ? String(scalar) : undefined;
}

function extractExtra(p: SourceProduct): ExtraProps {
  const out: ExtraProps = {};
  if (typeof p.density === 'number') out.density = String(p.density);
  if (p.diameters?.length) out.diameter = p.diameters.map(String).join(', ');
  const ext = formatTemp(p.extruder_temp_range, p.extruder_temp);
  if (ext !== undefined) out.extruder_temp = ext;
  const bed = formatTemp(p.bed_temp_range, p.bed_temp);
  if (bed !== undefined) out.bed_temp = bed;
  return out;
}

export function buildCandidates(
  file: SourceFile,
  typeFilter: Set<string> | null
): { mats: MaterialCandidate[]; spools: SpoolTypeCandidate[] } {
  const manufacturer = file.manufacturer;
  const mfrSlug = manufacturerSlug(manufacturer);

  // Group products into lines: key = filamentType + normalized tokens. Keep
  // the shortest-named product as the representative (cleanest label).
  type Line = {
    rep: SourceProduct;
    type: string;
    lineKey: string;
    members: SourceProduct[];
  };
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
    const byColor = new Map<
      string,
      { color: SourceColor; hex: string; props: ExtraProps }
    >();
    for (const p of line.members) {
      const props = extractExtra(p);
      for (const c of p.colors ?? []) {
        const hex = normalizeHex(c);
        if (!hex) continue;
        const slug = normName(c.name).replace(/\s+/g, '-');
        if (!slug || byColor.has(slug)) continue;
        byColor.set(slug, { color: c, hex, props });
      }
    }
    for (const [slug, { color, hex, props }] of byColor) {
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
        props,
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

// --- DB upsert (insert-only + claim; datasheet values seeded separately) ---

// Property seeding context, loaded once in main() and threaded through.
export type PropContext = {
  // property key -> property definition id
  idByKey: Map<string, string>;
  // property key -> declared value type, so seeded values are normalised and
  // validated exactly like a user's edit (see lib/property-value.ts)
  typeByKey: Map<string, PropertyValueType>;
  // "materialId:propertyId" pairs that already exist (insert-only guard)
  existingPairs: Set<string>;
};

// Insert-only seed of a material's datasheet values: a (material, property)
// pair is written once and never touched again, so re-crawls preserve any
// user/admin edits. Returns how many value rows were seeded. `materialId` is
// null in dry-run inserts (the material was never written) — then it just
// counts the values that would be seeded.
async function seedProps(
  materialId: string | null,
  props: ExtraProps,
  ctx: PropContext,
  dryRun: boolean
): Promise<number> {
  let seeded = 0;
  for (const key of PROPERTY_KEYS) {
    const value = props[key];
    if (value === undefined) continue;
    const propertyId = ctx.idByKey.get(key);
    if (!propertyId) continue;

    // Seeded values go through the same normalisation as a user's edit, so the
    // importer can never write something the property's declared type rejects
    // (which would leave bounds that filter wrongly). Checked before the
    // dry-run branch so a dry run reports the count a real run would write.
    const normalized = normalizePropertyValue(
      ctx.typeByKey.get(key) ?? 'text',
      value
    );
    if (!normalized.ok) continue;

    if (materialId === null) {
      seeded++; // dry-run insert: no id yet, just count
      continue;
    }
    const pair = `${materialId}:${propertyId}`;
    if (ctx.existingPairs.has(pair)) continue;
    ctx.existingPairs.add(pair);
    seeded++;
    if (!dryRun)
      await db.insert(materialProperties).values({
        materialId,
        propertyId,
        value: normalized.value,
        valueMin: normalized.min,
        valueMax: normalized.max,
        verified: true,
      });
  }
  return seeded;
}

export async function upsertMaterials(
  cands: MaterialCandidate[],
  ctx: PropContext,
  dryRun: boolean
) {
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
    enriched = 0; // datasheet value rows seeded

  for (const c of cands) {
    const known = byKey.get(c.externalKey);
    if (known) {
      // known.id is a real id only for pre-existing rows; within-run dup
      // placeholders have no id and get no property seeding.
      if (known.id) enriched += await seedProps(known.id, c.props, ctx, dryRun);
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
      if (!dryRun)
        await db
          .update(materials)
          .set({ externalKey: c.externalKey })
          .where(eq(materials.id, match.id));
      enriched += await seedProps(match.id, c.props, ctx, dryRun);
    } else {
      inserted++;
      if (!dryRun) {
        const [row] = await db
          .insert(materials)
          .values({
            manufacturer: c.manufacturer,
            name: c.name,
            filamentType: c.filamentType,
            color: c.color,
            status: 'approved',
            externalKey: c.externalKey,
          })
          .returning({ id: materials.id });
        enriched += await seedProps(row.id, c.props, ctx, dryRun);
      } else {
        enriched += await seedProps(null, c.props, ctx, dryRun);
      }
    }
    byKey.set(c.externalKey, {} as (typeof existing)[number]); // avoid dup within run
  }
  return { inserted, claimed, skipped, enriched };
}

export async function upsertSpoolTypes(
  cands: SpoolTypeCandidate[],
  dryRun: boolean
) {
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

// Every manufacturer available upstream (file names without .json).
// NOTE: this hits the GitHub contents API, which allows only 60 unauthenticated
// requests per hour per IP — cache the result rather than calling it per view.
export async function listManufacturers(): Promise<string[]> {
  const res = await fetch(CONTENTS_API, {
    headers: { 'User-Agent': 'spoolhouse-import' },
  });
  if (!res.ok) return [];
  const items = (await res.json()) as { name: string }[];
  return items
    .filter((i) => i.name.endsWith('.json'))
    .map((i) => i.name.replace(/\.json$/, ''));
}

// --- High-level operations shared by the CLI and the admin import page ---

export type ImportStats = {
  materialsInserted: number;
  materialsClaimed: number;
  materialsSkipped: number;
  propertyValuesSeeded: number;
  spoolTypesInserted: number;
  spoolTypesClaimed: number;
  spoolTypesSkipped: number;
};

export const EMPTY_STATS: ImportStats = {
  materialsInserted: 0,
  materialsClaimed: 0,
  materialsSkipped: 0,
  propertyValuesSeeded: 0,
  spoolTypesInserted: 0,
  spoolTypesClaimed: 0,
  spoolTypesSkipped: 0,
};

export function addStats(a: ImportStats, b: ImportStats): ImportStats {
  return {
    materialsInserted: a.materialsInserted + b.materialsInserted,
    materialsClaimed: a.materialsClaimed + b.materialsClaimed,
    materialsSkipped: a.materialsSkipped + b.materialsSkipped,
    propertyValuesSeeded: a.propertyValuesSeeded + b.propertyValuesSeeded,
    spoolTypesInserted: a.spoolTypesInserted + b.spoolTypesInserted,
    spoolTypesClaimed: a.spoolTypesClaimed + b.spoolTypesClaimed,
    spoolTypesSkipped: a.spoolTypesSkipped + b.spoolTypesSkipped,
  };
}

// Property-seeding context: the four definitions must exist, and existing
// material×property pairs are prefetched once for the insert-only guard.
// Build it once per run and pass it to every importManufacturer() call.
export async function loadPropertyContext(): Promise<PropContext> {
  const defs = await db
    .select({
      id: properties.id,
      key: properties.key,
      valueType: properties.valueType,
    })
    .from(properties);
  const idByKey = new Map(defs.map((d) => [d.key, d.id]));
  const typeByKey = new Map(
    defs.map((d) => [
      d.key,
      isPropertyValueType(d.valueType) ? d.valueType : ('text' as const),
    ])
  );
  const missing = PROPERTY_KEYS.filter((k) => !idByKey.has(k));
  if (missing.length) {
    throw new Error(
      `Missing property definitions: ${missing.join(', ')}. Run the app once so migrations apply, then retry.`
    );
  }
  const existingPairs = new Set<string>();
  for (const mp of await db
    .select({
      materialId: materialProperties.materialId,
      propertyId: materialProperties.propertyId,
    })
    .from(materialProperties)) {
    existingPairs.add(`${mp.materialId}:${mp.propertyId}`);
  }
  return { idByKey, typeByKey, existingPairs };
}

export class ManufacturerNotFound extends Error {
  constructor(public slug: string) {
    super(`Unknown manufacturer "${slug}" upstream`);
  }
}

// Fetches one manufacturer's source file and seeds it. Throws
// ManufacturerNotFound for an unknown slug and a plain Error for transport
// failures, so callers can report per-manufacturer outcomes.
export async function importManufacturer(
  slug: string,
  options: {
    ctx: PropContext;
    typeFilter?: Set<string> | null;
    dryRun?: boolean;
  }
): Promise<{ manufacturer: string; stats: ImportStats }> {
  const { ctx, typeFilter = null, dryRun = false } = options;
  const res = await fetch(`${RAW_BASE}/${slug}.json`, {
    headers: { 'User-Agent': 'spoolhouse-import' },
  });
  if (res.status === 404) throw new ManufacturerNotFound(slug);
  if (!res.ok)
    throw new Error(`Fetch failed for "${slug}" (HTTP ${res.status})`);

  const file = (await res.json()) as SourceFile;
  const { mats, spools } = buildCandidates(file, typeFilter);
  const m = await upsertMaterials(mats, ctx, dryRun);
  const s = await upsertSpoolTypes(spools, dryRun);
  return {
    manufacturer: file.manufacturer,
    stats: {
      materialsInserted: m.inserted,
      materialsClaimed: m.claimed,
      materialsSkipped: m.skipped,
      propertyValuesSeeded: m.enriched,
      spoolTypesInserted: s.inserted,
      spoolTypesClaimed: s.claimed,
      spoolTypesSkipped: s.skipped,
    },
  };
}
