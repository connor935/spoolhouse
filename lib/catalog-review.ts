import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  materials,
  spoolTypes,
  spools,
  user,
  type Material,
  type SpoolType,
} from '@/lib/db/schema';
import {
  findDuplicateCandidates,
  findSpoolTypeDuplicateCandidates,
  type DuplicateMatch,
  type SpoolTypeDuplicateMatch,
} from '@/lib/catalog-duplicates';
import type { PgColumn } from 'drizzle-orm/pg-core';

// Read side of the admin review queues (/admin/materials/review and
// /admin/spool-types/review): pending entries one at a time, oldest first,
// with the facts a reviewer decides on and possible duplicates. Callers must
// have checked requireAdmin(). Every query is bounded — the duplicate check
// sees at most a few hundred candidates, never the whole catalog.

/** Entries listed under "Up next". */
const UP_NEXT = 5;
/** Spool owners named in the summary. */
const OWNER_NAMES = 5;
/** Same manufacturer + type rows considered for colour/name proximity. */
const SAME_LINE_CANDIDATES = 200;
/** Trigram name matches considered (any manufacturer). */
const NAME_CANDIDATES = 50;

export type ReviewSubmitter = { name: string; trusted: boolean } | null;

export type ReviewQueue<TRow, TDuplicate> = {
  pendingCount: number;
  /** 0-based index of `current` in the queue; a `skip` past the end wraps to 0. */
  position: number;
  current: {
    row: TRow;
    submitter: ReviewSubmitter;
    spoolCount: number;
    spoolOwners: string[];
    /** Approved entries of the same manufacturer; 0 = new manufacturer. */
    manufacturerEntryCount: number;
  } | null;
  upNext: TRow[];
  duplicates: { match: TDuplicate; spoolCount: number }[];
};

type QueueTable = typeof materials | typeof spoolTypes;

// The pending slice from `skip`: the current entry plus "Up next", each with
// its submitter (better-auth user row, or null for imports).
async function pendingSlice<TRow>(table: QueueTable, skip: number) {
  const [{ value: pendingCount }] = await db
    .select({ value: count() })
    .from(table)
    .where(eq(table.status, 'pending'));
  const position = skip < pendingCount ? skip : 0;
  const rows = await db
    .select({
      row: table,
      submitterName: user.name,
      trusted: user.trustedContributor,
    })
    .from(table)
    .leftJoin(user, eq(table.submittedById, user.id))
    .where(eq(table.status, 'pending'))
    .orderBy(asc(table.createdAt), asc(table.id))
    .limit(UP_NEXT + 1)
    .offset(position);
  return {
    pendingCount,
    position,
    rows: rows as unknown as {
      row: TRow;
      submitterName: string | null;
      trusted: boolean | null;
    }[],
  };
}

async function usage(fk: PgColumn, id: string) {
  const [[{ value: spoolCount }], owners] = await Promise.all([
    db.select({ value: count() }).from(spools).where(eq(fk, id)),
    db
      .selectDistinct({ name: user.name })
      .from(spools)
      .innerJoin(user, eq(spools.userId, user.id))
      .where(eq(fk, id))
      .orderBy(asc(user.name))
      .limit(OWNER_NAMES),
  ]);
  return { spoolCount, spoolOwners: owners.map((o) => o.name) };
}

async function spoolCounts(fk: PgColumn, ids: string[]) {
  if (ids.length === 0) return new Map<string, number>();
  const rows = await db
    .select({ id: fk, value: count() })
    .from(spools)
    .where(inArray(fk, ids))
    .groupBy(fk);
  return new Map(rows.map((r) => [r.id as string, r.value]));
}

async function approvedOfManufacturer(table: QueueTable, manufacturer: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(table)
    .where(
      and(eq(table.status, 'approved'), eq(table.manufacturer, manufacturer))
    );
  return value;
}

const searchExpr = sql`(${materials.manufacturer} || ' ' || ${materials.name} || ' ' || ${materials.filamentType})`;

// Candidates for findDuplicateCandidates: the same manufacturer's entries of
// the same type (colour proximity), plus the closest trigram matches on the
// indexed search expression (`%` = similarity above pg_trgm's 0.3 default),
// which also catches spelling variants of the manufacturer.
async function materialCandidates(m: Material): Promise<Material[]> {
  const subjectExpr = `${m.manufacturer} ${m.name} ${m.filamentType}`;
  const notSelf = ne(materials.id, m.id);
  const [sameLine, byName] = await Promise.all([
    db
      .select()
      .from(materials)
      .where(
        and(
          notSelf,
          eq(materials.manufacturer, m.manufacturer),
          eq(materials.filamentType, m.filamentType)
        )
      )
      .orderBy(asc(materials.name), asc(materials.id))
      .limit(SAME_LINE_CANDIDATES),
    db
      .select()
      .from(materials)
      .where(and(notSelf, sql`${searchExpr} % ${subjectExpr}`))
      .orderBy(desc(sql`similarity(${searchExpr}, ${subjectExpr})`))
      .limit(NAME_CANDIDATES),
  ]);
  const byId = new Map([...sameLine, ...byName].map((r) => [r.id, r]));
  return [...byId.values()];
}

export async function getMaterialReviewQueue(
  skip: number
): Promise<ReviewQueue<Material, DuplicateMatch<Material>>> {
  const { pendingCount, position, rows } = await pendingSlice<Material>(
    materials,
    skip
  );
  const [first, ...rest] = rows;
  if (!first)
    return {
      pendingCount,
      position,
      current: null,
      upNext: [],
      duplicates: [],
    };
  const m = first.row;

  const [use, manufacturerEntryCount, candidates] = await Promise.all([
    usage(spools.materialId, m.id),
    approvedOfManufacturer(materials, m.manufacturer),
    materialCandidates(m),
  ]);
  const matches = findDuplicateCandidates(m, candidates);
  const counts = await spoolCounts(
    spools.materialId,
    matches.map((d) => d.candidate.id)
  );

  return {
    pendingCount,
    position,
    current: {
      row: m,
      submitter: submitterOf(first),
      ...use,
      manufacturerEntryCount,
    },
    upNext: rest.map((r) => r.row),
    duplicates: matches.map((match) => ({
      match,
      spoolCount: counts.get(match.candidate.id) ?? 0,
    })),
  };
}

export async function getSpoolTypeReviewQueue(
  skip: number
): Promise<ReviewQueue<SpoolType, SpoolTypeDuplicateMatch<SpoolType>>> {
  const { pendingCount, position, rows } = await pendingSlice<SpoolType>(
    spoolTypes,
    skip
  );
  const [first, ...rest] = rows;
  if (!first)
    return {
      pendingCount,
      position,
      current: null,
      upNext: [],
      duplicates: [],
    };
  const t = first.row;

  // The matcher only compares within a manufacturer, so that is the bound.
  const sameManufacturer: SQL = sql`lower(${spoolTypes.manufacturer}) = lower(${t.manufacturer})`;
  const [use, manufacturerEntryCount, candidates] = await Promise.all([
    usage(spools.spoolTypeId, t.id),
    approvedOfManufacturer(spoolTypes, t.manufacturer),
    db
      .select()
      .from(spoolTypes)
      .where(and(ne(spoolTypes.id, t.id), sameManufacturer))
      .orderBy(asc(spoolTypes.name), asc(spoolTypes.id))
      .limit(SAME_LINE_CANDIDATES),
  ]);
  const matches = findSpoolTypeDuplicateCandidates(t, candidates);
  const counts = await spoolCounts(
    spools.spoolTypeId,
    matches.map((d) => d.candidate.id)
  );

  return {
    pendingCount,
    position,
    current: {
      row: t,
      submitter: submitterOf(first),
      ...use,
      manufacturerEntryCount,
    },
    upNext: rest.map((r) => r.row),
    duplicates: matches.map((match) => ({
      match,
      spoolCount: counts.get(match.candidate.id) ?? 0,
    })),
  };
}

function submitterOf(r: {
  submitterName: string | null;
  trusted: boolean | null;
}): ReviewSubmitter {
  return r.submitterName === null
    ? null
    : { name: r.submitterName, trusted: r.trusted === true };
}
