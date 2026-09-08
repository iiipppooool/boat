"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** The sign-in form on /login. Same endpoint as the landing-page card's third tab. */
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          const response = await fetch("/api/account/session", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = (await response.json()) as { ok?: boolean; error?: string };
          if (!response.ok || !data.ok) {
            setError(data.error ?? "That did not work. Try again.");
            setBusy(false);
            return;
          }
          router.refresh();
          router.push("/account");
        } catch {
          setError("We could not reach the server. Try again in a moment.");
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label className="field-label" htmlFor="login-email">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="field-error">{error}</p>}
      </div>

      <button type="submit" className="btn btn-accent btn-block" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
