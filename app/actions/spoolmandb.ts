'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { catalogImports, materials } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-session';
import {
  ManufacturerNotFound,
  importManufacturer,
  listManufacturers,
  loadPropertyContext,
  type ImportStats,
} from '@/lib/spoolmandb';

// Admin-only: seeding the global catalogs from SpoolmanDB via /admin/import.
// The CLI (npm run db:import) drives the same lib functions.

export type UpstreamManufacturer = {
  slug: string;
  // Display name, once known from an import ("Bambu Lab" for slug "bambulab").
  manufacturerName: string | null;
  // Materials already in the catalog from this manufacturer.
  importedCount: number;
  lastImportedAt: Date | null;
  lastError: string | null;
};

// The upstream list changes rarely and the GitHub contents API allows only 60
// unauthenticated requests per hour per IP, so it is cached per server process.
let cachedSlugs: { at: number; slugs: string[] } | null = null;
const SLUG_CACHE_MS = 60 * 60 * 1000;

async function upstreamSlugs(): Promise<string[]> {
  if (cachedSlugs && Date.now() - cachedSlugs.at < SLUG_CACHE_MS)
    return cachedSlugs.slugs;
  const slugs = await listManufacturers();
  // Keep serving a stale list rather than an empty page if the API rate-limits.
  if (slugs.length === 0 && cachedSlugs) return cachedSlugs.slugs;
  cachedSlugs = { at: Date.now(), slugs };
  return slugs;
}

// Every manufacturer available upstream, annotated with what is already in the
// catalog.
//
// Counting is keyed off externalKey, which slugifies the manufacturer's display
// name — usually identical to the upstream file slug, but not guaranteed
// ("Bambu Lab" -> "bambu-lab" vs bambulab.json). Where a previous import
// recorded the display name, the exact manufacturer column is used instead, so
// the count is right either way. Rows imported via the CLI are included.
export async function getUpstreamManufacturers(): Promise<
  UpstreamManufacturer[]
> {
  await requireAdmin();
  const [slugs, imports, bySlug, byName] = await Promise.all([
    upstreamSlugs(),
    db.select().from(catalogImports),
    db
      .select({
        key: sql<string>`split_part(${materials.externalKey}, ':', 2)`.as(
          'key'
        ),
        n: sql<number>`count(*)::int`,
      })
      .from(materials)
      .where(sql`${materials.externalKey} LIKE 'spoolmandb:%'`)
      .groupBy(sql`split_part(${materials.externalKey}, ':', 2)`),
    db
      .select({ name: materials.manufacturer, n: sql<number>`count(*)::int` })
      .from(materials)
      .groupBy(materials.manufacturer),
  ]);

  const importBySlug = new Map(imports.map((i) => [i.slug, i]));
  const countByKey = new Map(bySlug.map((c) => [c.key, Number(c.n)]));
  const countByName = new Map(byName.map((c) => [c.name, Number(c.n)]));

  return slugs.map((slug) => {
    const imported = importBySlug.get(slug);
    const name = imported?.manufacturerName ?? null;
    return {
      slug,
      manufacturerName: name,
      importedCount:
        (name ? countByName.get(name) : undefined) ?? countByKey.get(slug) ?? 0,
      lastImportedAt: imported?.lastImportedAt ?? null,
      lastError: imported?.lastError ?? null,
    };
  });
}

export type ImportOutcome = {
  slug: string;
  manufacturer: string;
  stats: ImportStats;
};

// Imports one manufacturer. The page calls this once per selected manufacturer,
// sequentially: each call is a short unit of work (~1–2 s), which keeps progress
// visible and the queue resumable without any background job machinery.
export async function importManufacturerFromUpstream(
  slug: string,
  options: { types?: string[] } = {}
): Promise<ImportOutcome> {
  await requireAdmin();
  const typeFilter = options.types?.length
    ? new Set(options.types.map((t) => t.toUpperCase()))
    : null;

  try {
    const ctx = await loadPropertyContext();
    const { manufacturer, stats } = await importManufacturer(slug, {
      ctx,
      typeFilter,
    });
    await recordImport(slug, manufacturer, stats, null);
    revalidatePath('/materials');
    revalidatePath('/admin/materials');
    revalidatePath('/admin/import');
    return { slug, manufacturer, stats };
  } catch (err) {
    const message =
      err instanceof ManufacturerNotFound
        ? `"${slug}" no longer exists upstream`
        : (err as Error).message;
    await recordImport(slug, null, null, message);
    revalidatePath('/admin/import');
    throw new Error(message);
  }
}

async function recordImport(
  slug: string,
  manufacturerName: string | null,
  stats: ImportStats | null,
  error: string | null
) {
  const row = {
    slug,
    ...(manufacturerName ? { manufacturerName } : {}),
    materialsImported: stats?.materialsInserted ?? 0,
    spoolTypesImported: stats?.spoolTypesInserted ?? 0,
    lastError: error,
    lastImportedAt: error ? null : new Date(),
  };
  await db
    .insert(catalogImports)
    .values(row)
    .onConflictDoUpdate({
      target: catalogImports.slug,
      set: { ...row, updatedAt: new Date() },
    });
}

// Clears the recorded failure for a manufacturer (the row itself is history).
export async function clearImportError(slug: string) {
  await requireAdmin();
  await db
    .update(catalogImports)
    .set({ lastError: null, updatedAt: new Date() })
    .where(eq(catalogImports.slug, slug));
  revalidatePath('/admin/import');
}
