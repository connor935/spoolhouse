import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Droplets, MapPin, Pencil } from 'lucide-react';
import { markDried } from '@/app/actions/filaments';
import { useAsyncAction } from '@/hooks/use-async-action';
import { formatWeight, type SpoolView } from '@/lib/filament';
import { cn } from '@/lib/utils';

export function SpoolCard({
  spool,
  index,
  onEdit,
  dryingTemp,
}: {
  spool: SpoolView;
  index: number;
  onEdit: (s: SpoolView) => void;
  // The material's "Drying temp" property value (°C), if anyone filled it in
  dryingTemp?: string | null;
}) {
  const { pending, run } = useAsyncAction();

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
        {spool.location && spool.lentToName == null && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{spool.location}</span>
          </span>
        )}
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
          {spool.needsDrying && spool.lentToName == null && (
            <button
              type="button"
              className={cn(
                badgeVariants({ variant: 'outline' }),
                'border-accent/40 text-accent hover:bg-accent/10 cursor-pointer'
              )}
              disabled={pending}
              title={`${dryingTemp ? `Dry at ${dryingTemp} °C. ` : ''}Not dried for a while — click once it's dried.`}
              onClick={() =>
                run(() => markDried(spool.id), {
                  success: 'Marked as dried today',
                  error: 'Could not update the spool',
                })
              }
            >
              <Droplets />
              Dry?
            </button>
          )}
          {spool.lentToName && (
            <Badge variant="outline" className="border-accent/40 text-accent">
              Lent to {spool.lentToName}
            </Badge>
          )}
        </div>
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(spool)}
          disabled={spool.lentToName != null}
          aria-label="Edit spool"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
