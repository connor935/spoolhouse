import { LendHistoryTable, type LendHistoryEntry } from '../lend-history-table';
import { LendLine } from '../lend-line';
import { LendRequestCard } from '../lend-request-card';
import type { LendSpool } from '../lend-spool-label';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Button } from '@/components/ui/button';

type Base = { id: string; spool: LendSpool; groupName: string };

export type IncomingRequest = Base & {
  requesterName: string;
  /** "3 h ago" */
  time: string;
  dateTime: string;
  filamentLeftGrams: number;
};

export type OutgoingRequest = Base & {
  ownerName: string;
  time: string;
  dateTime: string;
};

export type LentOutLend = Base & {
  borrowerName: string;
  since: Date;
  usedGrams: number | null;
};

export type BorrowedLend = Base & {
  ownerName: string;
  since: Date;
  filamentLeftGrams: number;
  percentLeft: number;
};

type BorrowsViewProps = {
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
  lentOut: LentOutLend[];
  borrowed: BorrowedLend[];
  history: LendHistoryEntry[];
  /** The lend whose action is running; its buttons are disabled. */
  pendingId?: string | null;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  onMarkReturned: (id: string) => void;
  /** Opens the re-weigh popover (desktop) or sheet (mobile) at the button. */
  onWeigh: (id: string, anchor: HTMLElement) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function None({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

/** The /borrows page (Borrows board): every lend you're part of, all groups. */
function BorrowsView({
  incoming,
  outgoing,
  lentOut,
  borrowed,
  history,
  pendingId,
  onApprove,
  onDecline,
  onCancel,
  onMarkReturned,
  onWeigh,
}: BorrowsViewProps) {
  return (
    <div data-slot="borrows-view" className="flex flex-col gap-9">
      <PageHeader
        index="03"
        kicker="Borrows"
        meta={[
          plural(incoming.length, 'request'),
          `${lentOut.length} lent out`,
          `${borrowed.length} borrowed`,
        ].join(' · ')}
        title="Borrows"
      />

      <section aria-labelledby="borrows-incoming">
        <SectionHeader
          id="borrows-incoming"
          index="01"
          title="Requests for your spools"
          aside={
            incoming.length > 0 && (
              <span className="kicker">{incoming.length}</span>
            )
          }
        />
        {incoming.length === 0 ? (
          <None>Nobody is waiting for an answer from you.</None>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-3.5">
            {incoming.map((r) => (
              <LendRequestCard
                key={r.id}
                direction="incoming"
                spool={r.spool}
                counterpartName={r.requesterName}
                groupName={r.groupName}
                time={r.time}
                dateTime={r.dateTime}
                filamentLeftGrams={r.filamentLeftGrams}
                pending={pendingId === r.id}
                onApprove={() => onApprove(r.id)}
                onDecline={() => onDecline(r.id)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-x-10 gap-y-9">
        <section
          aria-labelledby="borrows-outgoing"
          className="min-w-0 flex-[1_1_420px]"
        >
          <SectionHeader
            id="borrows-outgoing"
            index="02"
            title="Your requests"
          />
          {outgoing.length === 0 ? (
            <None>
              No open requests. Borrow from a group&apos;s stock page.
            </None>
          ) : (
            outgoing.map((r) => (
              <LendRequestCard
                key={r.id}
                direction="outgoing"
                spool={r.spool}
                counterpartName={r.ownerName}
                groupName={r.groupName}
                time={r.time}
                dateTime={r.dateTime}
                pending={pendingId === r.id}
                onCancel={() => onCancel(r.id)}
              />
            ))
          )}
        </section>

        <section
          aria-labelledby="borrows-lent-out"
          className="min-w-0 flex-[1_1_420px]"
        >
          <SectionHeader id="borrows-lent-out" index="03" title="Lent out" />
          {lentOut.length === 0 ? (
            <None>None of your spools are out right now.</None>
          ) : (
            lentOut.map((l) => (
              <LendLine
                key={l.id}
                direction="out"
                spool={l.spool}
                counterpartName={l.borrowerName}
                since={l.since}
                usedGrams={l.usedGrams}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === l.id}
                    onClick={() => onMarkReturned(l.id)}
                  >
                    Mark returned
                  </Button>
                }
              />
            ))
          )}
        </section>
      </div>

      <section aria-labelledby="borrows-borrowed">
        <SectionHeader
          id="borrows-borrowed"
          index="04"
          title="Borrowed by you"
        />
        {borrowed.length === 0 ? (
          <None>You aren&apos;t borrowing anything.</None>
        ) : (
          borrowed.map((l) => (
            <LendLine
              key={l.id}
              direction="in"
              spool={l.spool}
              counterpartName={l.ownerName}
              since={l.since}
              groupName={l.groupName}
              filamentLeftGrams={l.filamentLeftGrams}
              percentLeft={l.percentLeft}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId === l.id}
                  onClick={(e) => onWeigh(l.id, e.currentTarget)}
                >
                  Weigh
                </Button>
              }
            />
          ))
        )}
      </section>

      <section aria-labelledby="borrows-history">
        <SectionHeader id="borrows-history" index="05" title="History" />
        {history.length === 0 ? (
          <None>Returned and declined lends will be listed here.</None>
        ) : (
          <LendHistoryTable entries={history} />
        )}
      </section>
    </div>
  );
}

export { BorrowsView };
