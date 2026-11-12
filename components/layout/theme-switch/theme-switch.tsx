'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type ThemeChoice = 'light' | 'dark' | 'system';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const isThemeChoice = (v: unknown): v is ThemeChoice =>
  OPTIONS.some((o) => o.value === v);

// Light / Dark / System segmented switch from the user menu and the mobile
// drawer. `value` is undefined until next-themes has mounted on the client.
function ThemeSwitch({
  value,
  onValueChange,
  className,
}: {
  value: string | undefined;
  onValueChange: (theme: ThemeChoice) => void;
  className?: string;
}) {
  // A container query, not a breakpoint: the user menu is ~200px wide at any
  // viewport, too narrow for three nowrap mono labels (the last segment was
  // clipped). Below 15rem the segments show icons only; the label stays for
  // screen readers and as the tooltip.
  return (
    <div className={cn('@container w-full', className)}>
      <ToggleGroup
        aria-label="Theme"
        value={isThemeChoice(value) ? [value] : []}
        onValueChange={(next) => {
          const choice = next[0];
          if (isThemeChoice(choice)) onValueChange(choice);
        }}
        className="w-full"
      >
        {OPTIONS.map(({ value: v, label, icon: Icon }) => (
          <ToggleGroupItem
            key={v}
            value={v}
            title={label}
            className="min-w-0 flex-1 justify-center px-2"
          >
            <Icon aria-hidden />
            <span className="sr-only @[15rem]:not-sr-only">{label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export { ThemeSwitch };
