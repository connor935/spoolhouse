/** `?skip=` of the review queues: a non-negative integer, anything else 0. */
export function parseReviewSkip(value: string | string[] | undefined): number {
  const n = typeof value === 'string' ? Number(value) : 0;
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100_000) : 0;
}
