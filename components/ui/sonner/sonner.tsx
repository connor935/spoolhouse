'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CheckIcon,
  CircleAlertIcon,
  InfoIcon,
  TriangleAlertIcon,
  Loader2Icon,
} from 'lucide-react';

// Below Tailwind's `sm` breakpoint toasts drop in from the top, where they don't
// cover the mobile bottom nav; on desktop they stack bottom-right.
const MOBILE_QUERY = '(max-width: 639px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

// Design language: `.toast` (inverted) and `.toast.err` (destructive) in
// .claude/design/spoolhouse.css. Sonner reads its colours from the --normal-*
// variables, so the error variant just redefines them on the toast element.
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position={isMobile ? 'top-center' : 'bottom-right'}
      className="toaster group"
      icons={{
        success: <CheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <CircleAlertIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--foreground)',
          '--normal-text': 'var(--background)',
          '--normal-border': 'var(--foreground)',
          '--border-radius': '6px',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'cn-toast gap-2.5! px-3.5! py-3! font-sans! text-sm! shadow-toast!',
          error:
            '[--normal-bg:var(--destructive)] [--normal-border:var(--destructive)] [--normal-text:var(--destructive-foreground)]',
          description: 'opacity-80',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
