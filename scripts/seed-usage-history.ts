// Dev seed for /stats: a year of spools with prices, locations and a realistic
// weighing history (incl. used-up spools and repurchases), for the admin user
// or --email. Materials and spool types are picked from the existing catalog
// (run a SpoolmanDB import first). Every seeded spool is tagged
// `seed-history-<n>`, so it can be removed again without touching real data.
// Usage: npx tsx scripts/seed-usage-history.ts [--email you@x] [--reset | --clean]
import { and, asc, eq, ilike, like } from 'drizzle-orm';
import { closeDb, db, runMigrations } from '../lib/db';
import { withLocalDb } from './local-db.mjs';
import {
  materials,
  spools,
  spoolTypes,
  spoolWeighings,
  user,
} from '../lib/db/schema';

const TAG_PREFIX = 'seed-history-';
const DAY_MS = 24 * 60 * 60 * 1000;

// Deterministic, so re-seeding produces the same charts.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const between = (min: number, max: number) => min + rand() * (max - min);

type SpoolSpec = {
  manufacturer: string;
  type: string;
  pick: number; // offset into that manufacturer's materials of the type
  startDaysAgo: number;
  gramsPerDay: number;
  priceCents: number | null;
  location: string | null;
  driedDaysAgo?: number;
  winterOnly?: boolean;
};

// Same `pick` = same material: the Prusament Galaxy-ish PLA is the workhorse,
// used up twice and bought a third time.
const SPECS: SpoolSpec[] = [
  {
    manufacturer: 'Prusament',
    type: 'PLA',
    pick: 0,
    startDaysAgo: 360,
    gramsPerDay: 9,
    priceCents: 2999,
    location: 'Shelf A',
  },
  {
    manufacturer: 'Prusament',
    type: 'PLA',
    pick: 0,
    startDaysAgo: 245,
    gramsPerDay: 8,
    priceCents: 2999,
    location: 'Shelf A',
  },
  {
    manufacturer: 'Prusament',
    type: 'PLA',
    pick: 0,
    startDaysAgo: 118,
    gramsPerDay: 6,
    priceCents: 3199,
    location: 'Printer 1',
  },
  {
    manufacturer: 'Spectrum',
    type: 'PLA',
    pick: 3,
    startDaysAgo: 330,
    gramsPerDay: 3,
    priceCents: 2290,
    location: 'Shelf A',
  },
  {
    manufacturer: 'Sunlu',
    type: 'PLA',
    pick: 5,
    startDaysAgo: 300,
    gramsPerDay: 4.5,
    priceCents: 1599,
    location: 'Shelf B',
  },
  {
    manufacturer: 'Sunlu',
    type: 'PLA',
    pick: 12,
    startDaysAgo: 50,
    gramsPerDay: 5,
    priceCents: 1599,
    location: 'Printer 2',
  },
  {
    manufacturer: 'Polymaker',
    type: 'PLA',
    pick: 20,
    startDaysAgo: 365,
    gramsPerDay: 2,
    priceCents: 2199,
    location: 'Shelf B',
  },
  {
    manufacturer: 'Polymaker',
    type: 'PETG',
    pick: 2,
    startDaysAgo: 280,
    gramsPerDay: 2.5,
    priceCents: 2499,
    location: 'Dry box 1',
    driedDaysAgo: 12,
  },
  {
    manufacturer: 'Prusament',
    type: 'PETG',
    pick: 4,
    startDaysAgo: 200,
    gramsPerDay: 4,
    priceCents: 2999,
    location: 'Dry box 1',
    driedDaysAgo: 75,
  },
  {
    manufacturer: 'Spectrum',
    type: 'PETG',
    pick: 10,
    startDaysAgo: 120,
    gramsPerDay: 3,
    priceCents: 2490,
    location: 'Shelf C',
  },
  {
    manufacturer: 'Fiberlogy',
    type: 'PETG',
    pick: 7,
    startDaysAgo: 20,
    gramsPerDay: 0,
    priceCents: 2790,
    location: 'Shelf C',
  },
  {
    manufacturer: 'Spectrum',
    type: 'ASA',
    pick: 1,
    startDaysAgo: 240,
    gramsPerDay: 1.5,
    priceCents: null,
    location: 'Shelf C',
  },
  {
    manufacturer: 'Prusament',
    type: 'ASA',
    pick: 3,
    startDaysAgo: 60,
    gramsPerDay: 2,
    priceCents: 3299,
    location: 'Shelf C',
  },
  {
    manufacturer: 'Polymaker',
    type: 'TPU',
    pick: 0,
    startDaysAgo: 210,
    gramsPerDay: 0.8,
    priceCents: 3490,
    location: 'Dry box 2',
    driedDaysAgo: 40,
  },
  {
    manufacturer: 'Sunlu',
    type: 'ABS',
    pick: 2,
    startDaysAgo: 330,
    gramsPerDay: 3,
    priceCents: null,
    location: 'Shelf B',
    winterOnly: true,
  },
  {
    manufacturer: 'Polymaker',
    type: 'Nylon',
    pick: 0,
    startDaysAgo: 90,
    gramsPerDay: 1.2,
    priceCents: 4499,
    location: 'Dry box 2',
    driedDaysAgo: 5,
  },
];

async function pickMaterial(spec: SpoolSpec) {
  const [row] = await db
    .select({ id: materials.id, name: materials.name })
    .from(materials)
    .where(
      and(
        eq(materials.manufacturer, spec.manufacturer),
        eq(materials.filamentType, spec.type),
        eq(materials.status, 'approved')
      )
    )
    .orderBy(asc(materials.name), asc(materials.id))
    .limit(1)
    .offset(spec.pick);
  return row;
}

async function pickSpoolType(manufacturer: string) {
  const [own] = await db
    .select()
    .from(spoolTypes)
    .where(
      and(
        eq(spoolTypes.manufacturer, manufacturer),
        ilike(spoolTypes.name, '%1 kg%'),
        eq(spoolTypes.status, 'approved')
      )
    )
    .orderBy(asc(spoolTypes.id))
    .limit(1);
  if (own) return own;
  const [any] = await db
    .select()
    .from(spoolTypes)
    .where(eq(spoolTypes.status, 'approved'))
    .orderBy(asc(spoolTypes.id))
    .limit(1);
  return any;
}

// Heavier printing in winter: factor ~1.35 in January, ~0.65 in July.
function seasonal(d: Date, winterOnly: boolean) {
  const m = d.getUTCMonth();
  if (winterOnly && m >= 3 && m <= 9) return 0;
  return 1 + 0.35 * Math.cos((2 * Math.PI * m) / 12);
}

// Weighings every few days from purchase until today or until it runs empty.
function simulate(spec: SpoolSpec, emptyGrams: number, now: Date) {
  const full = 1000;
  let filament = full + Math.round(between(0, 15)); // spools ship slightly over
  let t = new Date(now.getTime() - spec.startDaysAgo * DAY_MS);
  const points = [{ grams: emptyGrams + filament, at: t }];
  while (filament > 0) {
    const gap = Math.round(between(2, 12)) + (rand() < 0.06 ? 14 : 0); // vacations
    const next = new Date(t.getTime() + gap * DAY_MS + between(-3, 3) * 3600e3);
    if (next >= now) break;
    t = next;
    const used = Math.round(
      spec.gramsPerDay *
        gap *
        seasonal(t, !!spec.winterOnly) *
        between(0.2, 1.8)
    );
    if (used <= 0) continue;
    filament = Math.max(0, filament - used);
    if (filament <= 5) filament = Math.round(between(0, 4)); // scrap on the reel
    points.push({ grams: emptyGrams + filament, at: t });
    if (filament <= 5) break;
  }
  return { points, full };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf('--email');
  const email = emailIdx >= 0 ? args[emailIdx + 1]?.toLowerCase() : undefined;
  const [owner] = await db
    .select()
    .from(user)
    .where(email ? eq(user.email, email) : eq(user.role, 'admin'))
    .limit(1);
  if (!owner) {
    console.error(email ? `No user ${email}.` : 'No admin account found.');
    process.exit(1);
  }

  const seeded = and(
    eq(spools.userId, owner.id),
    like(spools.tagUid, `${TAG_PREFIX}%`)
  );
  if (args.includes('--reset') || args.includes('--clean')) {
    // Weighings (and any lends) cascade with the spool.
    const removed = await db
      .delete(spools)
      .where(seeded)
      .returning({ id: spools.id });
    console.log(`Removed ${removed.length} seeded spools of ${owner.email}.`);
    if (args.includes('--clean')) return;
  } else if (
    (await db.select({ id: spools.id }).from(spools).where(seeded)).length
  ) {
    console.log(
      `${owner.email} already has seeded spools — pass --reset to re-seed.`
    );
    return;
  }

  const now = new Date();
  let weighings = 0;
  for (const [i, spec] of SPECS.entries()) {
    const material = await pickMaterial(spec);
    const spoolType = await pickSpoolType(spec.manufacturer);
    if (!material || !spoolType) {
      console.warn(`skip: no ${spec.manufacturer} ${spec.type} in the catalog`);
      continue;
    }
    const { points, full } = simulate(spec, spoolType.emptyWeightGrams, now);
    const first = points[0].at;
    const last = points[points.length - 1];
    await db.transaction(async (tx) => {
      const [spool] = await tx
        .insert(spools)
        .values({
          userId: owner.id,
          materialId: material.id,
          spoolTypeId: spoolType.id,
          fullFilamentWeightGrams: full,
          measuredTotalWeightGrams: last.grams,
          tagUid: `${TAG_PREFIX}${i + 1}`,
          pricePaidCents: spec.priceCents,
          purchasedAt: ymd(new Date(first.getTime() - 3 * DAY_MS)),
          location: spec.location,
          lastDriedAt:
            spec.driedDaysAgo === undefined
              ? null
              : new Date(now.getTime() - spec.driedDaysAgo * DAY_MS),
          createdAt: first,
          updatedAt: last.at,
        })
        .returning({ id: spools.id });
      await tx.insert(spoolWeighings).values(
        points.map((p) => ({
          spoolId: spool.id,
          userId: owner.id,
          grams: p.grams,
          measuredAt: p.at,
        }))
      );
    });
    weighings += points.length;
    const left = last.grams - spoolType.emptyWeightGrams;
    console.log(
      `  ${spec.manufacturer} ${material.name} (${spec.type}) — ${points.length} weighings, ${left} g left`
    );
  }
  console.log(
    `\nSeeded ${SPECS.length} spools / ${weighings} weighings for ${owner.email}.`
  );
}

withLocalDb(async () => {
  await runMigrations();
  await main();
  await closeDb();
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
