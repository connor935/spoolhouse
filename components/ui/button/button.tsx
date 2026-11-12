import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Design language: `.btn` / `.ibtn` / `.linkbtn` in .claude/design/spoolhouse.css.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] border border-transparent bg-clip-padding text-sm leading-none font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/88',
        accent: 'bg-accent text-accent-foreground hover:bg-accent/88',
        outline:
          'border-ink bg-card text-foreground hover:bg-muted aria-expanded:bg-muted',
        secondary:
          'bg-muted text-foreground hover:bg-muted/70 aria-expanded:bg-muted/70',
        ghost:
          'text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/88 focus-visible:ring-destructive',
        'destructive-outline':
          'border-destructive text-destructive hover:bg-destructive/10 focus-visible:ring-destructive',
        link: 'font-mono text-[11px] tracking-[0.06em] text-accent-ink uppercase underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-9 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "h-6 gap-1 rounded-[4px] px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[30px] gap-1.5 px-2.5 text-[13px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-11 px-[18px] text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-7 rounded-[4px]',
        'icon-xs': "size-5 rounded-[4px] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          "size-6 rounded-[4px] [&_svg:not([class*='size-'])]:size-3.5",
        'icon-lg': 'size-9',
      },
    },
    compoundVariants: [
      // `.linkbtn` is inline text, not a box: drop the size's height and padding.
      {
        variant: 'link',
        size: ['default', 'xs', 'sm', 'lg'],
        className: 'h-auto p-0',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
