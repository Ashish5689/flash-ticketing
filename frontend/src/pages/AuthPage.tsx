import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Chrome, Mail, ShieldCheck, Sparkles, Ticket } from "lucide-react";

export function AuthPage() {
  return (
    <main className="auth-stage">
      <section className="auth-hero">
        <div className="auth-copy">
          <span className="pill hot"><Sparkles size={14} /> India&apos;s fastest live ticket drop</span>
          <h1>Book the seat before the city does.</h1>
          <p>Queue fairly, watch seats move live, and checkout before your hold expires.</p>
          <div className="trust-strip">
            <span><ShieldCheck size={16} /> Clerk Auth</span>
            <span><Ticket size={16} /> Redis holds</span>
            <span><Mail size={16} /> Stripe test checkout</span>
          </div>
        </div>
        <div className="auth-card">
          <div className="auth-brand">
            <Ticket size={24} />
            <div>
              <strong>Flash Ticketing</strong>
              <span>Sign in to continue</span>
            </div>
          </div>
          <SignInButton mode="modal" fallbackRedirectUrl="/" forceRedirectUrl="/">
            <button className="google-button" type="button">
              <Chrome size={18} /> Continue with Clerk
            </button>
          </SignInButton>
          <SignUpButton mode="modal" fallbackRedirectUrl="/" forceRedirectUrl="/">
            <button className="primary" type="button">
              Create account
            </button>
          </SignUpButton>
          <p className="auth-note">Use Google, email, or any provider enabled in your Clerk dashboard.</p>
        </div>
      </section>
    </main>
  );
}
