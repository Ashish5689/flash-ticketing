import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, id, label, children, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="grid gap-2">
      {label ? (
        <label className="text-sm font-medium" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        className={cn(
          'min-h-11 rounded border border-border bg-surface px-3 text-sm text-foreground transition duration-fast hover:border-muted focus:border-focus disabled:bg-surface-subtle',
          className,
        )}
        id={inputId}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
