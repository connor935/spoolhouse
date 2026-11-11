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
  return (
    <ToggleGroup
      aria-label="Theme"
      value={isThemeChoice(value) ? [value] : []}
      onValueChange={(next) => {
        const choice = next[0];
        if (isThemeChoice(choice)) onValueChange(choice);
      }}
      className={cn('w-full', className)}
    >
      {OPTIONS.map(({ value: v, label, icon: Icon }) => (
        <ToggleGroupItem key={v} value={v} className="flex-1 justify-center">
          <Icon aria-hidden />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export { ThemeSwitch };
