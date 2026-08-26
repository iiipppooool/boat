"use client";

import { useState } from "react";

const TOPICS = [
  "Buying a boat",
  "Selling a boat",
  "Listing verification",
  "Dealer / Boathouse enquiry",
  "A problem with a listing",
  "Press",
  "Something else",
];

/**
 * v1 stub: submissions are validated and acknowledged in the browser but not yet
 * posted anywhere. Wiring it up means adding a POST handler that forwards to the
 * support inbox — the form contract below is already the one to send.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="panel">
        <p className="eyebrow">Sent</p>
        <h2 style={{ fontSize: "var(--step-2)", marginBottom: "var(--sp-3)" }}>
          Thanks — that has reached us.
        </h2>
        <p className="muted">
          We reply to everything within one working day, usually sooner. If it is
          about a specific listing, quoting the reference (the <code>bx-</code> code
          on the listing page) gets you an answer faster.
        </p>
        <button type="button" className="btn btn-ghost mt-5" onClick={() => setSent(false)}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="contact-name">Your name</label>
          <input id="contact-name" name="name" type="text" required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="contact-topic">What is it about</label>
        <select id="contact-topic" name="topic" defaultValue={TOPICS[0]}>
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="contact-ref">
          Listing reference <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </label>
        <input id="contact-ref" name="reference" type="text" placeholder="bx-1001" />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" rows={7} required />
      </div>

      <button type="submit" className="btn btn-accent">Send message</button>
      <p className="tiny muted mt-4">
        We use your email to answer you and nothing else. No newsletter unless you
        ask for one.
      </p>
    </form>
  );
}
