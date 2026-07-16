import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, id, label, hint, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  return (
    <div className="grid gap-2">
      {label ? (
        <label className="text-sm font-medium" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        aria-describedby={hint ? hintId : undefined}
        className={cn(
          'min-h-28 w-full resize-y rounded border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted transition duration-fast hover:border-muted focus:border-focus disabled:bg-surface-subtle',
          className,
        )}
        id={inputId}
        {...props}
      />
      {hint ? (
        <p className="text-xs text-muted" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
