import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your BoatXchange listings, subscription and invoices.",
};

/**
 * v1 stub. There is no session, no password store and no email delivery behind
 * this yet — the form is here so the flow is designed and reachable, and the
 * account page it leads to renders a fixed demo account.
 *
 * The intended implementation is the emailed sign-in link shown below: it suits
 * a marketplace where people sell one boat every four years and will not
 * remember a password, and it avoids storing credentials for an audience that
 * would reuse them.
 */
export default function LoginPage() {
  return (
    <div className="wrap section login-wrap">
      <div className="login-panel panel">
        <p className="eyebrow">Sign in</p>
        <h1 className="login-title">Welcome back.</h1>
        <p className="muted small">
          We email you a link rather than asking for a password. Most people sell a
          boat once every few years and nobody remembers a password that long.
        </p>

        <form className="mt-6">
          <div className="field">
            <label className="field-label" htmlFor="login-email">Email address</label>
            <input id="login-email" name="email" type="email" autoComplete="email" required />
            <span className="field-hint">
              The address you listed with, or the one your club uses.
            </span>
          </div>
          <button type="submit" className="btn btn-accent btn-block">
            Email me a sign-in link
          </button>
        </form>

        <p className="notice mt-6">
          <strong>Not wired up in this build.</strong> Authentication is stubbed —{" "}
          <Link href="/account">go straight to the demo account</Link> to see what
          sits behind it.
        </p>

        <p className="small muted mt-5">
          Don&rsquo;t have an account? One is created the first time you{" "}
          <Link href="/sell">list a boat</Link>. Buyers do not need an account at all.
        </p>
      </div>
    </div>
  );
}
