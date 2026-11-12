import type { ReactNode } from 'react';

import { BrandLogo } from '@/components/layout/brand-logo';
import { cn } from '@/lib/utils';

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  /** Kicker line under the form: "No account? Sign up", "← Back to sign in". */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Card of the signed-out pages (Auth board): brand, display title with a 2px
 * ink rule, then the form. Centred by app/(auth)/layout.tsx; renders the
 * page's one <h1>.
 */
function AuthCard({
  title,
  description,
  footer,
  children,
  className,
}: AuthCardProps) {
  return (
    <div
      data-slot="auth-card"
      className={cn(
        'border-ink bg-card w-full max-w-[400px] overflow-hidden rounded-[6px] border',
        className
      )}
    >
      <div className="border-ink flex flex-col gap-3.5 border-b-2 px-6 pt-6 pb-[18px]">
        <BrandLogo />
        <div className="flex flex-col gap-1.5">
          <h1 className="display-h1 text-[40px]">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-[13px]">{description}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3.5 px-6 pt-5 pb-6">
        {children}
        {footer && (
          <div className="kicker [&_a]:text-accent-ink text-center [&_a]:hover:underline">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export { AuthCard };
