import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, id, label, hint, error, leadingIcon, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className="grid gap-2">
      {label ? (
        <label className="text-sm font-medium text-foreground" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          aria-describedby={hint || error ? descriptionId : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            'min-h-11 w-full rounded border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted transition duration-fast hover:border-muted focus:border-focus disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60',
            Boolean(leadingIcon) && 'pl-10',
            error && 'border-brand',
            className,
          )}
          id={inputId}
          {...props}
        />
      </div>
      {hint || error ? (
        <p className={cn('text-xs text-muted', error && 'text-brand')} id={descriptionId}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
});
