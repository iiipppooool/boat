import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/SignInForm";
import { getSessionAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your BoatXchange listings, subscription and invoices.",
};

/**
 * Sign-in.
 *
 * Email and password, checked against a scrypt hash, issuing a real session
 * cookie. See src/lib/auth.ts for why those choices and not others. Somebody
 * already signed in is sent straight to their account rather than shown a form
 * they do not need.
 */
export default async function LoginPage() {
  if (await getSessionAccount()) redirect("/account");

  return (
    <div className="wrap section login-wrap">
      <div className="login-panel panel">
        <p className="eyebrow">Sign in</p>
        <h1 className="login-title">Welcome back.</h1>
        <p className="muted small">
          The address and password you registered with. Buyers do not need an
          account. This is for sellers, clubs and dealers.
        </p>

        <SignInForm />

        <p className="small muted mt-6">
          No account yet?{" "}
          <Link href="/#waitlist">Create one from the home page</Link>. It takes a
          name, an address and a password, and puts you on the waiting list at the
          same time.
        </p>
      </div>
    </div>
  );
}
