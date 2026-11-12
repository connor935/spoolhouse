'use client';

import { Search } from 'lucide-react';
import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { focusSearch } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';

// The Search-icon + `type="search"` Input pattern shared by the inventory
// filter and both catalogs. `shortcut`: "/" focuses it, with the hint shown.
export function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  shortcut = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  shortcut?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => focusSearch(ref.current) }, shortcut);
  return (
    <div className={cn('relative min-w-40 flex-1', className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('h-9 pl-8', shortcut && 'pr-9')}
        aria-label={ariaLabel}
        aria-keyshortcuts={shortcut ? '/' : undefined}
      />
      {shortcut && (
        <Kbd
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
        >
          /
        </Kbd>
      )}
    </div>
  );
}
