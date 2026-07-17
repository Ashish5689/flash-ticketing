import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthLayout, GoogleIcon } from '../components/auth/AuthLayout';
import { Button, Input } from '../components/ui';
import { exchangeFirebaseToken } from '../lib/api';
import { authErrorMessage } from '../lib/auth-error';
import { signInWithEmail, signInWithGoogle } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finishSignIn = async (getIdToken: () => Promise<string>, source: 'google' | 'email') => {
    setLoading(source);
    setError(null);
    try {
      const session = await exchangeFirebaseToken(await getIdToken());
      setSession(session);
      const destination = (location.state as { from?: string } | null)?.from ?? '/account';
      navigate(destination, { replace: true });
    } catch (caughtError) {
      setError(authErrorMessage(caughtError));
    } finally {
      setLoading(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));
    void finishSignIn(() => signInWithEmail(email, password), 'email');
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to manage bookings, saved shows, and your account."
      footer={
        <>
          New to Flash Ticketing?{' '}
          <Link className="font-semibold text-brand hover:text-brand-hover" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <div className="grid gap-5">
        <Button
          disabled={loading !== null}
          fullWidth
          onClick={() => void finishSignIn(signInWithGoogle, 'google')}
          variant="outline"
        >
          <GoogleIcon /> {loading === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </Button>
        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-muted">
          <span className="h-px flex-1 bg-border" /> or use email{' '}
          <span className="h-px flex-1 bg-border" />
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            autoComplete="email"
            label="Email address"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
          <Input
            autoComplete="current-password"
            label="Password"
            minLength={6}
            name="password"
            placeholder="Enter your password"
            required
            type="password"
          />
          {error ? (
            <p className="rounded bg-brand-soft px-3 py-2 text-sm text-brand" role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={loading !== null} fullWidth type="submit">
            {loading === 'email' ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
