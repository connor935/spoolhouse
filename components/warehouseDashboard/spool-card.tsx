import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { formatWeight, type SpoolView } from '@/lib/filament';

export function SpoolCard({
  spool,
  index,
  onEdit,
}: {
  spool: SpoolView;
  index: number;
  onEdit: (s: SpoolView) => void;
}) {
  const barColor = spool.isEmpty
    ? 'bg-muted-foreground/30'
    : spool.isLow
      ? 'bg-destructive'
      : 'bg-accent';

  return (
    <li className="flex flex-col gap-2 px-5 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">
            #{index + 1}
          </span>
        </div>

        <span className="w-16 shrink-0 font-mono text-sm font-semibold tabular-nums">
          {formatWeight(spool.filamentLeftGrams)}
        </span>
        <div
          className="bg-secondary h-2 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(spool.percentLeft)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${spool.percentLeft}%` }}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={() => onEdit(spool)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-4">
        {spool.isEmpty ? (
          <Badge
            variant="outline"
            className="border-muted-foreground/30 text-muted-foreground"
          >
            Empty
          </Badge>
        ) : spool.isLow ? (
          <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">
            Low
          </Badge>
        ) : null}
        {spool.lentToName && (
          <Badge variant="outline" className="border-accent/40 text-accent">
            Lent to {spool.lentToName}
          </Badge>
        )}
      </div>
    </li>
  );
}
