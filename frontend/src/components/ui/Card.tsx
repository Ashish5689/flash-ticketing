import type { HTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '../../lib/cn';

export type CardProps = PropsWithChildren<HTMLAttributes<HTMLElement>>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <article
      className={cn('rounded-lg border border-border bg-surface p-5 shadow-sm', className)}
      {...props}
    >
      {children}
    </article>
  );
}
