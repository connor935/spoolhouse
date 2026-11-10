import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Design language: `.tag` in .claude/design/spoolhouse.css. Clickable tags
// ("Dry?") render as a <button> or <a> via `render` and pick up a pointer + hover.
const tag = {
  default: 'border-ink text-foreground',
  muted: 'border-border text-muted-foreground',
};

const badgeVariants = cva(
  'group/badge inline-flex h-[18px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[3px] border bg-transparent px-[5px] font-mono text-[10.5px] leading-none font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-[opacity,background-color] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [a&]:cursor-pointer [a&]:hover:opacity-80 [button&]:cursor-pointer [button&]:hover:opacity-80 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: tag.default,
        muted: tag.muted,
        accent: 'border-accent text-accent',
        'accent-solid': 'border-accent bg-accent text-accent-foreground',
        destructive:
          'border-destructive bg-destructive text-destructive-foreground',
        'destructive-outline': 'border-destructive text-destructive',
        inverted: 'border-foreground bg-foreground text-background',
        // Legacy names, kept so existing callers render as tags.
        outline: tag.default,
        secondary: tag.muted,
        ghost: 'border-transparent text-muted-foreground',
        link: 'border-transparent text-accent underline-offset-4 [a&]:hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
