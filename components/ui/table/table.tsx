'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

// .tbl: mono uppercase headers over an ink rule, bordered rows, first/last
// cells flush with the table edge, `align="right"` for numeric columns.
type CellAlign = { align?: 'left' | 'right' };

function Table({
  className,
  scrollLabel,
  ...props
}: React.ComponentProps<'table'> & {
  /** Names the horizontal scroll container and makes it keyboard-focusable
   *  (WCAG 2.1.1): set it on tables that can overflow on narrow screens. */
  scrollLabel?: string;
}) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'relative w-full overflow-x-auto',
        scrollLabel &&
          'focus-visible:ring-accent rounded-[2px] outline-none focus-visible:ring-2'
      )}
      {...(scrollLabel && {
        role: 'region',
        'aria-label': scrollLabel,
        tabIndex: 0,
      })}
    >
      <table
        data-slot="table"
        className={cn(
          'w-full caption-bottom border-collapse text-sm',
          className
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={className} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('font-medium', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn('data-[state=selected]:bg-muted', className)}
      {...props}
    />
  );
}

function TableHead({
  className,
  align,
  ...props
}: React.ComponentProps<'th'> & CellAlign) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-muted-foreground border-ink border-b px-3 pb-2.5 text-left align-bottom font-mono text-[10.5px] leading-none font-medium tracking-[0.08em] whitespace-nowrap uppercase first:pl-0 last:pr-0',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  align,
  ...props
}: React.ComponentProps<'td'> & CellAlign) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'border-b p-3 align-middle first:pl-0 last:pr-0',
        align === 'right' && 'text-right tabular-nums',
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('fine mt-3 text-left', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
