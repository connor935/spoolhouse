// Pure chart geometry shared by the stats components (components/stats/*).

const NICE_STEPS = [1, 2, 2.5, 5, 10];

// `count` round ticks above 0 (steps of 1/2/2.5/5 × 10ⁿ) for values up to
// `max`, and the top of the scale. The step whose top tick lands closest to
// the peak wins, so the top tick may sit a little below it — the scale top
// leaves headroom above both. Integer steps only: values are grams or cents.
export function valueTicks(
  max: number,
  count = 3
): { ticks: number[]; top: number } {
  const raw = Math.max(max / count, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const candidates = [pow / 10, pow]
    .flatMap((p) => NICE_STEPS.map((f) => f * p))
    .filter((s) => Number.isInteger(s));
  const step = candidates.reduce((best, s) =>
    Math.abs(s * count - max) < Math.abs(best * count - max) ? s : best
  );
  const ticks = Array.from({ length: count }, (_, i) => (i + 1) * step);
  return { ticks, top: Math.max(max, ticks[count - 1]) * 1.08 };
}

// Whole percentages of the total that add up to exactly 100 (largest
// remainder: floor every share, then hand the missing points to the largest
// fractions). All zero → all zero.
export function wholePercentages(values: number[]): number[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * 100);
  const result = exact.map(Math.floor);
  let missing = 100 - result.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, rest: v - Math.floor(v) }))
    .sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (missing <= 0) break;
    result[i]++;
    missing--;
  }
  return result;
}
