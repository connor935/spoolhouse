import { spoolNumber } from '@/components/inventory/spool-tile';
import { Swatch } from '@/components/inventory/swatch';
import { cn } from '@/lib/utils';

/** The lent spool as the borrow surfaces show it: "#03 Prusa Orange". */
export type LendSpool = {
  materialName: string;
  /** Material colour (hex). */
  color?: string | null;
  /** Position in the owner's oldest-first list; omitted when unknown. */
  number?: number | null;
};

/** "#03 Prusa Orange", or just the name when the number is unknown. */
function lendSpoolName(spool: LendSpool): string {
  return spool.number
    ? `${spoolNumber(spool.number)} ${spool.materialName}`
    : spool.materialName;
}

// Fixed table rather than Intl: newer ICU data spells September "Sept" in
// en-GB, and server and browser may ship different versions.
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "12 Oct" (UTC): lend periods on the Borrows board never show the year. */
function shortDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getUTCMonth()]}`;
}

/** Swatch + spool name; the swatch is decorative, the name carries it. */
function LendSpoolLabel({
  spool,
  swatch = true,
  className,
}: {
  spool: LendSpool;
  /** Leave the swatch out where a direction tag already leads the row. */
  swatch?: boolean;
  className?: string;
}) {
  return (
    <span
      data-slot="lend-spool-label"
      className={cn('inline-flex min-w-0 items-center gap-2', className)}
    >
      {swatch && <Swatch color={spool.color} decorative />}
      <span className="truncate">{lendSpoolName(spool)}</span>
    </span>
  );
}

export { LendSpoolLabel, lendSpoolName, shortDate };
