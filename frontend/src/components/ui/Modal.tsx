import { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/cn';

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
}>;

export function Modal({
  open,
  title,
  description,
  footer,
  children,
  onClose,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      aria-label="Close modal"
      className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      role="presentation"
    >
      <section
        aria-describedby={description ? 'modal-description' : undefined}
        aria-labelledby="modal-title"
        aria-modal="true"
        className={cn('w-full max-w-md rounded-lg bg-surface p-6 shadow-md', className)}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold" id="modal-title">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-muted" id="modal-description">
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded text-muted transition duration-fast hover:bg-surface-subtle hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
      </section>
    </div>,
    document.body,
  );
}
