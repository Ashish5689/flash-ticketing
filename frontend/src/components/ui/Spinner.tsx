import { cn } from '../../lib/cn';

type SpinnerProps = {
  label?: string;
  className?: string;
};

export function Spinner({ label = 'Loading', className }: SpinnerProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-3 text-sm text-muted', className)}
      role="status"
    >
      <span
        aria-hidden="true"
        className="size-7 animate-spin rounded-full border-2 border-brand-soft border-t-brand"
      />
      <span>{label}</span>
    </span>
  );
}
