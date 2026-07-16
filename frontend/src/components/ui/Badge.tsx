import type { HTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '../../lib/cn';

type BadgeVariant = 'neutral' | 'nowShowing' | 'comingSoon';

export type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
  }
>;

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-subtle text-muted',
  nowShowing: 'bg-success-soft text-success',
  comingSoon: 'bg-info-soft text-info',
};

export function Badge({ children, className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-sm px-2.5 py-1 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
