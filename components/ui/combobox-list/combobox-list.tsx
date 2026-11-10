import * as React from 'react';

import { cn } from '@/lib/utils';

// Presentational look for searchable pickers (.pop / .opt / .opt.hl). The
// behaviour stays with the caller — today `useCombobox` (hooks/use-combobox.ts)
// supplies the input/listbox props and the active index:
//
//   <ComboboxPopup className="absolute mt-1 w-full">
//     <ComboboxList id={…} {...combobox.listboxProps}>
//       {results.map((m, i) => (
//         <ComboboxOption key={m.id} active={i === activeIndex} …>…</ComboboxOption>
//       ))}
//     </ComboboxList>
//     <ComboboxFooter>max. 50 shown</ComboboxFooter>
//   </ComboboxPopup>

function ComboboxPopup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="combobox-popup"
      className={cn(
        'bg-card text-card-foreground border-ink shadow-pop z-50 flex flex-col overflow-hidden rounded-[6px] border',
        className
      )}
      {...props}
    />
  );
}

function ComboboxList({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="combobox-list"
      role="listbox"
      className={cn('max-h-72 overflow-y-auto', className)}
      {...props}
    />
  );
}

function ComboboxOption({
  className,
  active = false,
  ...props
}: React.ComponentProps<'div'> & {
  /** The keyboard-highlighted row (.opt.hl). */
  active?: boolean;
}) {
  return (
    <div
      data-slot="combobox-option"
      role="option"
      aria-selected={active}
      data-active={active || undefined}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 border-t px-3 py-[9px] text-sm first:border-t-0',
        'hover:bg-accent/5 data-active:bg-accent/10',
        className
      )}
      {...props}
    />
  );
}

function ComboboxEmpty({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="combobox-empty"
      className={cn('text-muted-foreground px-3 py-4 text-sm', className)}
      {...props}
    />
  );
}

// Row under the list: filter buttons and/or a kicker like "max. 50 shown".
function ComboboxFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="combobox-footer"
      className={cn(
        'kicker flex flex-wrap items-center gap-2 border-t px-3 py-2.5',
        className
      )}
      {...props}
    />
  );
}

export {
  ComboboxEmpty,
  ComboboxFooter,
  ComboboxList,
  ComboboxOption,
  ComboboxPopup,
};
