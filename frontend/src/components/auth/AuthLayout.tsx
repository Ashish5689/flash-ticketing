import { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import { BrandMark } from '../layout/BrandMark';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  description: string;
  footer: ReactNode;
}>;

export function AuthLayout({ title, description, footer, children }: AuthLayoutProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  return (
    <div className="min-h-screen bg-surface-dark">
      <header className="text-brand-contrast">
        <div className="mx-auto flex min-h-20 max-w-content items-center px-5 sm:px-8">
          <BrandMark className="text-brand-contrast" />
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-content items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_28rem]">
        <section className="relative hidden min-h-[34rem] overflow-hidden rounded-xl lg:block">
          <img
            alt="Flash Ticketing movie collection"
            className="absolute inset-0 size-full object-cover"
            src="https://d1f9tbdxdqavp.cloudfront.net/movies/showcase/kuberaa.png"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-brand-contrast">
            <h2 className="max-w-lg text-4xl font-extrabold tracking-tight">
              Your next great story starts with a seat.
            </h2>
            <p className="mt-4 max-w-md text-brand-contrast/75">
              Sign in once to book faster and keep every ticket ready on your phone.
            </p>
          </div>
        </section>
        <section className="w-full overflow-hidden rounded-xl border border-brand-contrast/10 bg-surface shadow-md">
          <div className="border-b border-border px-6 py-7 sm:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </div>
          <div className="px-6 py-7 sm:px-8">{children}</div>
          <div className="border-t border-border bg-surface-subtle px-6 py-5 text-center text-sm text-muted sm:px-8">
            {footer}
          </div>
        </section>
      </main>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.32 2.98-7.42Z"
        fill="currentColor"
      />
      <path
        d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.24-2.5c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.58A10 10 0 0 0 12 22Z"
        fill="currentColor"
        opacity=".76"
      />
      <path
        d="M6.39 13.91A6 6 0 0 1 6.08 12c0-.66.11-1.3.31-1.91V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.49l3.35-2.58Z"
        fill="currentColor"
        opacity=".58"
      />
      <path
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.58C7.18 7.72 9.39 5.96 12 5.96Z"
        fill="currentColor"
        opacity=".88"
      />
    </svg>
  );
}
