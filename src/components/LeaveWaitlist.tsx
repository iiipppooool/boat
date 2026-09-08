"use client";

import { useState } from "react";

/** The confirm step behind an unsubscribe link. One field, one button, no argument. */
export function LeaveWaitlist({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  if (state === "done") {
    return (
      <div className="panel">
        <p className="eyebrow">Done</p>
        <h2 className="mb-6" style={{ fontSize: "var(--step-2)" }}>
          You are off the list.
        </h2>
        <p className="muted">
          We will not email you about the launch. Your address stays recorded as
          having left, so an import cannot quietly put you back on, and nothing
          else about you is kept.
        </p>
      </div>
    );
  }

  return (
    <form
      className="panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setState("sending");
        setError("");
        try {
          const response = await fetch("/api/waitlist/leave", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
          });
          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error ?? "That did not work. Try again in a moment.");
            setState("error");
            return;
          }
          setState("done");
        } catch {
          setError("We could not reach the server. Try again in a moment.");
          setState("error");
        }
      }}
    >
      <div className="field">
        <label className="field-label" htmlFor="leave-email">
          Email address
        </label>
        <input
          id="leave-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="field-error">{error}</p>}
      </div>
      <button type="submit" className="btn" disabled={state === "sending"}>
        {state === "sending" ? "Removing…" : "Remove me from the list"}
      </button>
    </form>
  );
}
