import { Chrome, Mail, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { useState } from "react";
import { authClient } from "../auth";
import { useAuth } from "../hooks/useAuth";

export function AuthPage() {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("admin@admin.com");
  const [name, setName] = useState("Ashish Admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "login"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(result.error.message ?? "Authentication failed");
        return;
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setError("");
    setBusy(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="auth-stage">
      <section className="auth-hero">
        <div className="auth-copy">
          <span className="pill hot"><Sparkles size={14} /> India&apos;s fastest live ticket drop</span>
          <h1>Book the seat before the city does.</h1>
          <p>Queue fairly, watch seats move live, and checkout before your hold expires.</p>
          <div className="trust-strip">
            <span><ShieldCheck size={16} /> Neon Auth</span>
            <span><Ticket size={16} /> Redis holds</span>
            <span><Mail size={16} /> Stripe test checkout</span>
          </div>
        </div>
        <form onSubmit={submit} className="auth-card">
          <div className="auth-brand">
            <Ticket size={24} />
            <div>
              <strong>Flash Ticketing</strong>
              <span>Sign in to continue</span>
            </div>
          </div>
          <div className="segment">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Sign up</button>
          </div>
          <button type="button" className="google-button" onClick={googleSignIn} disabled={busy}>
            <Chrome size={18} /> Continue with Google
          </button>
          <div className="divider"><span>or use email</span></div>
          {mode === "register" && (
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
          )}
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
