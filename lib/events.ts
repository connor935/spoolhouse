import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { groupMembers } from '@/lib/db/schema';

type Listener = () => void;

// Per-user listener registry backing the /api/events SSE streams. Kept on
// globalThis so it survives dev hot reloads (same pattern as lib/db). Module
// scope holds only this Map — no I/O — so importing during `next build` is safe.
const globalForEvents = globalThis as unknown as {
  eventListeners?: Map<string, Set<Listener>>;
};
const listeners = (globalForEvents.eventListeners ??= new Map<
  string,
  Set<Listener>
>());

// Register a listener for one user's change signals. Returns the unsubscribe
// function; the last unsubscribe removes the user's Set entirely.
export function subscribe(userId: string, listener: Listener): () => void {
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(userId);
  };
}

// Fire a payload-free "your data changed" signal to every open stream of the
// given users. A broken listener must never affect other streams or the
// mutation that emitted.
export function emitToUsers(userIds: Iterable<string>) {
  for (const userId of new Set(userIds)) {
    for (const listener of listeners.get(userId) ?? []) {
      try {
        listener();
      } catch {
        // the stream cleans itself up on its own enqueue failure
      }
    }
  }
}

// A spool/lend change is visible to the owner and — via pooled group stock —
// to every member of the owner's groups (that includes any borrower: lends
// only exist inside groups). Best-effort: never throws, so live refresh can't
// fail the mutation that triggered it.
export async function emitSpoolChange(ownerId: string) {
  try {
    const ownGroups = db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, ownerId));
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, ownGroups));
    emitToUsers([ownerId, ...members.map((m) => m.userId)]);
  } catch (error) {
    console.error('emitSpoolChange failed:', error);
  }
}
