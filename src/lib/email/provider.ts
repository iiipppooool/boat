import "server-only";

/**
 * The single place BoatXchange sends email.
 *
 * Same shape as the AI adapter in src/lib/ai/provider.ts and for the same
 * reason: one interface, one env var, and no route handler that knows which
 * vendor is behind it. Adding Postmark or SES later is a function in this file.
 *
 * The default adapter is `log`, not a live sender. An unconfigured install must
 * not silently drop a signup confirmation *or* fail the signup, so with no
 * credentials the message is written to the server log, the API still returns
 * ok, and the entry is safely on the list either way. Delivery is best-effort;
 * the database write is the thing that must not fail.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Set on bulk-ish mail so a mail client offers one-click unsubscribe. */
  listUnsubscribe?: string;
  replyTo?: string;
}

export interface EmailResult {
  ok: boolean;
  /** Which adapter handled it, surfaced in logs, never to the recipient. */
  provider: string;
  id?: string;
  error?: string;
}

export interface EmailProvider {
  id: string;
  /** True when mail actually leaves the building. */
  live: boolean;
  send(message: EmailMessage): Promise<EmailResult>;
}

/** Fallback sender used when no credentials are configured. */
const logProvider: EmailProvider = {
  id: "log",
  live: false,
  async send(message) {
    console.info(
      `[email:log] would send to ${message.to}, "${message.subject}"\n${message.text}\n`,
    );
    return { ok: true, provider: "log" };
  },
};

/**
 * Resend, over plain fetch rather than their SDK: one POST, one JSON body, no
 * dependency to keep in step with the rest of the tree.
 */
function resendProvider(apiKey: string): EmailProvider {
  return {
    id: "resend",
    live: true,
    async send(message) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: emailFrom(),
            to: [message.to],
            subject: message.subject,
            text: message.text,
            html: message.html,
            ...(message.replyTo ? { reply_to: message.replyTo } : {}),
            ...(message.listUnsubscribe
              ? { headers: { "List-Unsubscribe": `<${message.listUnsubscribe}>` } }
              : {}),
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          return { ok: false, provider: "resend", error: `${response.status} ${body.slice(0, 300)}` };
        }

        const data = (await response.json()) as { id?: string };
        return { ok: true, provider: "resend", id: data.id };
      } catch (error) {
        return {
          ok: false,
          provider: "resend",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM || "BoatXchange <onboarding@resend.dev>";
}

/** Where signup notifications go. Blank disables the internal copy. */
export function notifyAddress(): string {
  return process.env.EMAIL_NOTIFY_TO || "";
}

export function getEmailProvider(): EmailProvider {
  const choice = process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? "resend" : "log");
  if (choice === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn("[email] EMAIL_PROVIDER=resend but RESEND_API_KEY is unset, logging instead.");
      return logProvider;
    }
    return resendProvider(key);
  }
  return logProvider;
}

/**
 * Send without letting a mail failure take a request down with it. Callers that
 * are in the middle of a user-facing action (a signup) use this, so a provider
 * outage costs a confirmation email and nothing else.
 */
export async function sendQuietly(message: EmailMessage): Promise<EmailResult> {
  const provider = getEmailProvider();
  const result = await provider.send(message);
  if (!result.ok) {
    console.error(`[email] delivery to ${message.to} failed via ${result.provider}: ${result.error}`);
  }
  return result;
}
