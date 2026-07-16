import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
  }
>;

const variants: Record<ButtonVariant, string> = {
  primary:
    'border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover',
  outline: 'border-brand bg-surface text-brand hover:bg-brand-soft',
  ghost: 'border-transparent bg-transparent text-foreground hover:bg-surface-subtle',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-4 text-sm',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-7 text-base',
};

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded border font-semibold transition duration-fast disabled:cursor-not-allowed disabled:opacity-40',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
