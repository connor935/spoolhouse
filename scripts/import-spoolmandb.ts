// CLI for seeding the global materials & spool-type catalogs from
// SpoolmanDB-Community. The importing itself lives in lib/spoolmandb.ts, which
// the admin page (/admin/import) drives too — this file is argument parsing and
// console output only.
//
// Usage:
//   npm run db:import -- --manufacturer spectrum [--manufacturer polymaker] \
//                        [--type PETG,PLA] [--dry-run]
//
// Insert-only and idempotent: re-running never overwrites or deletes existing
// rows (see lib/spoolmandb.ts for the details).
//
// Runs against whatever DATABASE_URL names; with none set it uses (and starts,
// if needed) the local PGlite database — see CLAUDE.md "Database setup".
import { closeDb, runMigrations } from '../lib/db';
import {
  EMPTY_STATS,
  ManufacturerNotFound,
  addStats,
  importManufacturer,
  listManufacturers,
  loadPropertyContext,
  type ImportStats,
} from '../lib/spoolmandb';
import { withLocalDb } from './local-db.mjs';

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

function summary(stats: ImportStats): string {
  return (
    `materials ${stats.materialsInserted} inserted / ${stats.materialsClaimed} claimed / ${stats.materialsSkipped} skipped` +
    (stats.propertyValuesSeeded
      ? ` (${stats.propertyValuesSeeded} property values seeded)`
      : '') +
    ` · spool types ${stats.spoolTypesInserted} inserted / ${stats.spoolTypesClaimed} claimed / ${stats.spoolTypesSkipped} skipped`
  );
}

async function main() {
  const { manufacturers, types, dryRun } = parseArgs(process.argv.slice(2));
  if (manufacturers.length === 0) {
    console.error(
      'Usage: npm run db:import -- --manufacturer <slug> [--manufacturer …] [--type PETG,PLA] [--dry-run]'
    );
    const available = await listManufacturers();
    if (available.length)
      console.error(
        `\nAvailable manufacturers (${available.length}):\n  ${available.join(', ')}`
      );
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

  const ctx = await loadPropertyContext();
  let totals = EMPTY_STATS;

  for (const slug of manufacturers) {
    try {
      const { manufacturer, stats } = await importManufacturer(slug, {
        ctx,
        typeFilter,
        dryRun,
      });
      console.log(`✓ ${manufacturer}: ${summary(stats)}`);
      totals = addStats(totals, stats);
    } catch (err) {
      if (err instanceof ManufacturerNotFound) {
        console.error(`✗ ${slug}: not found upstream.`);
        const available = await listManufacturers();
        if (available.length)
          console.error(`  Available: ${available.join(', ')}`);
        continue;
      }
      console.error(`✗ ${slug}: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nTotal: ${summary(totals)}` +
      (dryRun ? '\n(dry run — nothing written)' : '')
  );
}

// The local dev database is started on demand (and stopped again) when nothing
// is serving it yet; closeDb() releases the pool so the script exits.
withLocalDb(async () => {
  await runMigrations();
  await main();
  await closeDb();
})
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
