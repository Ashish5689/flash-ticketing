import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          soft: 'var(--color-brand-soft)',
          contrast: 'var(--color-brand-contrast)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          subtle: 'var(--color-surface-subtle)',
          dark: 'var(--color-surface-dark)',
          elevated: 'var(--color-surface-elevated)',
        },
        background: 'var(--color-bg)',
        foreground: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        focus: 'var(--color-focus)',
        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          soft: 'var(--color-info-soft)',
        },
        seat: {
          available: 'var(--color-seat-available)',
          selected: 'var(--color-seat-selected)',
          held: 'var(--color-seat-held)',
          sold: 'var(--color-seat-sold)',
          bestseller: 'var(--color-seat-bestseller)',
        },
        overlay: 'var(--color-overlay)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        focus: 'var(--shadow-focus)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
      },
      maxWidth: {
        content: 'var(--container-max)',
      },
    },
  },
  plugins: [],
} satisfies Config;
