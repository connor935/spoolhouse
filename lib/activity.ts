// The Overview's "Recent activity" feed: the viewer's weighings and lend
// events merged into one newest-first list. Pure: lib/recent-activity.ts reads
// the rows, this shapes them, the page renders them.
import { computeFilamentLeft } from '@/lib/filament';

export type WeighingActivityRow = {
  id: string;
  spoolId: string;
  /** Measured total weight (spool + filament). */
  grams: number;
  /** The spool's weighing before this one; null for its first. */
  previousGrams: number | null;
  measuredAt: Date;
  emptyWeightGrams: number;
  materialName: string;
  ownerId: string;
  /** Who put it on the scale; null for backfilled rows or deleted users. */
  actorId: string | null;
  actorName: string | null;
};

export type LendActivityRow = {
  id: string;
  spoolId: string;
  status: string; // requested | active | declined | returned
  requestedAt: Date;
  respondedAt: Date | null;
  returnedAt: Date | null;
  ownerId: string;
  ownerName: string;
  borrowerId: string;
  borrowerName: string;
  materialName: string;
};

export type LendEvent = 'requested' | 'approved' | 'declined' | 'returned';

export type ActivityEvent =
  | {
      kind: 'weigh';
      id: string;
      at: Date;
      spoolId: string;
      materialName: string;
      leftGrams: number;
      /** Change in grams since the previous weighing (negative = used). */
      deltaGrams: number | null;
      /** Set when someone other than the viewer weighed it (a borrower). */
      byName: string | null;
    }
  | {
      kind: 'lend';
      id: string;
      at: Date;
      event: LendEvent;
      lendId: string;
      spoolId: string;
      materialName: string;
      /** The viewer's side of the lend. */
      role: 'owner' | 'borrower';
      otherName: string;
      /** A request on the viewer's spool that still waits for an answer. */
      pending: boolean;
    };

export function shapeActivity(
  weighings: WeighingActivityRow[],
  lendRows: LendActivityRow[],
  viewerId: string,
  limit = 10
): ActivityEvent[] {
  const entries: ActivityEvent[] = weighings.map((w) => ({
    kind: 'weigh',
    id: `w:${w.id}`,
    at: w.measuredAt,
    spoolId: w.spoolId,
    materialName: w.materialName,
    leftGrams: computeFilamentLeft(w.grams, w.emptyWeightGrams),
    deltaGrams: w.previousGrams === null ? null : w.grams - w.previousGrams,
    byName: w.actorId !== null && w.actorId !== viewerId ? w.actorName : null,
  }));

  for (const l of lendRows) {
    const role = l.ownerId === viewerId ? 'owner' : 'borrower';
    const event = (name: LendEvent, at: Date): ActivityEvent => ({
      kind: 'lend',
      id: `l:${l.id}:${name}`,
      at,
      event: name,
      lendId: l.id,
      spoolId: l.spoolId,
      materialName: l.materialName,
      role,
      otherName: role === 'owner' ? l.borrowerName : l.ownerName,
      pending:
        name === 'requested' && role === 'owner' && l.status === 'requested',
    });
    entries.push(event('requested', l.requestedAt));
    if (l.respondedAt)
      entries.push(
        event(l.status === 'declined' ? 'declined' : 'approved', l.respondedAt)
      );
    if (l.returnedAt) entries.push(event('returned', l.returnedAt));
  }

  return entries
    .sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id))
    .slice(0, limit);
}

const dayKeyFormats = new Map<string, Intl.DateTimeFormat>();

// Calendar day in `timeZone` as a UTC midnight timestamp, for day differences.
function dayNumber(date: Date, timeZone: string): number {
  let format = dayKeyFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dayKeyFormats.set(timeZone, format);
  }
  const [y, m, d] = format.format(date).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / (24 * 60 * 60 * 1000);
}

/** Feed time column: "14:02" today, "Yday", otherwise "07 Nov". */
export function activityTime(at: Date, now: Date, timeZone: string): string {
  const days = dayNumber(now, timeZone) - dayNumber(at, timeZone);
  if (days <= 0)
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(at);
  if (days === 1) return 'Yday';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
  }).format(at);
}
