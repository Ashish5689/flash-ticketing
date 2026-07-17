import { Link } from 'react-router-dom';

import { cn } from '../../lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      aria-label="Flash Ticketing home"
      className={cn(
        'inline-flex items-center gap-2.5 text-xl font-extrabold tracking-tight',
        className,
      )}
      to="/"
    >
      <span className="relative grid size-8 -rotate-6 place-items-center rounded-lg bg-brand text-brand-contrast shadow-sm">
        <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
          <path
            d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v1.2a3.5 3.5 0 0 0 0 6.6v1.2a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-1.2a3.5 3.5 0 0 0 0-6.6V7.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="m13 7-3 5h3l-2 5 5-7h-3l2-3" fill="currentColor" />
        </svg>
      </span>
      <span>Flash Ticketing</span>
    </Link>
  );
}
