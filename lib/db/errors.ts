// Postgres error helpers. Drizzle wraps driver errors (DrizzleQueryError) and
// keeps the original pg error as `cause`, so look at both levels.

type PgError = { code?: string; constraint?: string };

function pgError(error: unknown): PgError | null {
  if (typeof error !== 'object' || error === null) return null;
  const e = error as PgError & { cause?: unknown };
  if (typeof e.code === 'string') return e;
  if (typeof e.cause === 'object' && e.cause !== null) {
    const cause = e.cause as PgError;
    if (typeof cause.code === 'string') return cause;
  }
  return null;
}

// True if `error` is a unique violation (SQLSTATE 23505) of the named
// constraint/index — lets callers turn a lost race into a friendly message.
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const e = pgError(error);
  return e?.code === '23505' && e.constraint === constraint;
}
