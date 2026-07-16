import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout, GoogleIcon } from '../components/auth/AuthLayout';
import { Button, Input } from '../components/ui';
import { exchangeFirebaseToken } from '../lib/api';
import { authErrorMessage } from '../lib/auth-error';
import { registerWithEmail, signInWithGoogle } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finish = async (getIdToken: () => Promise<string>, source: 'google' | 'email') => {
    setLoading(source);
    setError(null);
    try {
      setSession(await exchangeFirebaseToken(await getIdToken()));
      navigate('/account', { replace: true });
    } catch (caughtError) {
      setError(authErrorMessage(caughtError));
    } finally {
      setLoading(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name')).trim();
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));
    const confirmation = String(formData.get('confirmation'));
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    void finish(() => registerWithEmail(name, email, password), 'email');
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Join to save shows, book seats, and keep every ticket in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link className="font-semibold text-brand hover:text-brand-hover" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <div className="grid gap-5">
        <Button
          disabled={loading !== null}
          fullWidth
          onClick={() => void finish(signInWithGoogle, 'google')}
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
            autoComplete="name"
            label="Full name"
            minLength={2}
            name="name"
            placeholder="Your name"
            required
          />
          <Input
            autoComplete="email"
            label="Email address"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
          <Input
            autoComplete="new-password"
            hint="Use at least 6 characters."
            label="Password"
            minLength={6}
            name="password"
            required
            type="password"
          />
          <Input
            autoComplete="new-password"
            label="Confirm password"
            minLength={6}
            name="confirmation"
            required
            type="password"
          />
          {error ? (
            <p className="rounded bg-brand-soft px-3 py-2 text-sm text-brand" role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={loading !== null} fullWidth type="submit">
            {loading === 'email' ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
