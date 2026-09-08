"use client";

import { useState } from "react";

type Action = "checkout" | "portal";

/**
 * The buttons that start a Boathouse subscription and open Stripe's billing
 * portal. Both do the same thing: ask our API for a Stripe-hosted URL and send
 * the browser there. No card details ever touch this application.
 *
 * When billing is not configured the API answers 503 with a readable message,
 * which is rendered in place rather than swallowed, "nothing happened when I
 * clicked" is the worst possible failure mode for a payment button.
 */
export function BillingActions({
  subscribed, hasBillingHistory,
}: {
  subscribed: boolean;
  hasBillingHistory: boolean;
}) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(action: Action) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/billing/${action}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Something went wrong.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="cluster mt-5">
        {subscribed ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => go("portal")}
            disabled={busy !== null}
          >
            {busy === "portal" ? "Opening…" : "Manage subscription"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={() => go("checkout")}
            disabled={busy !== null}
          >
            {busy === "checkout" ? "Starting…" : "Subscribe to Boathouse"}
          </button>
        )}

        {hasBillingHistory && !subscribed && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => go("portal")}
            disabled={busy !== null}
          >
            {busy === "portal" ? "Opening…" : "Invoices & card"}
          </button>
        )}
      </div>

      {error && (
        <p className="field-error mt-4" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
