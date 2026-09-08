import "server-only";
import { SITE } from "../site";
import type { EmailMessage } from "./provider";

/**
 * Every email the product sends, written once here.
 *
 * Both parts of every message are written by hand: a plain-text version that
 * reads properly on its own, and an HTML version built from inline styles
 * because email clients strip <style> blocks and know nothing of CSS variables.
 * The palette is the site's, hard-coded, since a mail client cannot read
 * globals.css.
 */

const HULL = "#0d242d";
const BONE = "#f5f1e9";
const BRASS = "#c98a34";
const SLATE = "#55606a";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, body: string, footer: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BONE};color:${HULL};font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BONE};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d3cab6;">
        <tr><td style="background:${HULL};padding:20px 28px;">
          <span style="font-size:20px;font-weight:700;letter-spacing:-0.01em;color:${BONE};">boat<span style="color:${BRASS};">X</span>change</span>
        </td></tr>
        <tr><td style="padding:28px;">${body}</td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e3dccd;color:${SLATE};font-size:13px;line-height:1.5;">${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;">${text}</p>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:22px 0;"><a href="${href}" style="background:${BRASS};color:${HULL};text-decoration:none;font-weight:600;padding:12px 20px;display:inline-block;">${escapeHtml(label)}</a></p>`;
}

export interface WelcomeInput {
  email: string;
  name: string;
  position: number;
  /** Whether we are telling them their number. Below the floor, we do not. */
  showPosition: boolean;
}

/**
 * The confirmation. It promises exactly two things — a note when the market
 * opens in their part of the world, and nothing else — because that is the
 * only promise we can keep, and a waiting-list email that oversells is the
 * fastest way to be marked as spam.
 */
export function welcomeEmail(input: WelcomeInput): EmailMessage {
  const greeting = input.name ? `Hello ${input.name},` : "Hello,";
  const place = input.showPosition
    ? `You are number ${input.position} on the list.`
    : "You are on the list.";
  const unsubscribe = `${SITE.url}/waitlist/leave?email=${encodeURIComponent(input.email)}`;

  const text = `${greeting}

${place} Thank you — that genuinely helps.

BoatXchange is being built as the marketplace rowing has never had: one place
to buy and sell hulls, oars, riggers, trailers, kit and gear, with the specs
that actually decide a purchase — crew weight band, layup, hull weight, repair
history — on every listing.

What happens next:

  1. We open the market to the waiting list first, region by region, starting
     where the most of you are.
  2. Listing is free. We charge a commission only when something sells.
  3. We never hold your money. Buyer and seller settle directly; we invoice our
     commission afterwards, to the seller.

We will email you when the market opens where you are, and when something is
genuinely worth telling you about. Not weekly. Not a newsletter.

If you have a boat you already want to move, reply to this message and tell us
what it is — early listings shape what we build first.

— The BoatXchange team

Leave the list at any time: ${unsubscribe}`;

  const html = shell(
    "You are on the BoatXchange waiting list",
    [
      paragraph(escapeHtml(greeting)),
      paragraph(`<strong>${escapeHtml(place)}</strong> Thank you — that genuinely helps.`),
      paragraph(
        "BoatXchange is being built as the marketplace rowing has never had: one place to buy and sell hulls, oars, riggers, trailers, kit and gear, with the specs that actually decide a purchase — crew weight band, layup, hull weight, repair history — on every listing.",
      ),
      `<p style="margin:0 0 8px;font-weight:600;">What happens next</p>`,
      `<ol style="margin:0 0 14px;padding-left:20px;color:${SLATE};">
         <li style="margin-bottom:8px;">We open the market to the waiting list first, region by region, starting where the most of you are.</li>
         <li style="margin-bottom:8px;">Listing is free. We charge a commission only when something sells.</li>
         <li style="margin-bottom:8px;"><strong style="color:${HULL};">We never hold your money.</strong> Buyer and seller settle directly; we invoice our commission afterwards, to the seller.</li>
       </ol>`,
      button(`${SITE.url}/market`, "See what is listed so far"),
      paragraph(
        "If you have a boat you already want to move, just reply to this message and tell us what it is — early listings shape what we build first.",
      ),
    ].join(""),
    `You are receiving this because you joined the BoatXchange waiting list with ${escapeHtml(input.email)}.<br><a href="${unsubscribe}" style="color:${SLATE};">Leave the list</a>`,
  );

  return {
    to: input.email,
    subject: input.showPosition
      ? `You are number ${input.position} on the BoatXchange list`
      : "You are on the BoatXchange waiting list",
    text,
    html,
    listUnsubscribe: unsubscribe,
  };
}

export interface NotifyInput {
  to: string;
  email: string;
  name: string;
  role: string;
  country: string;
  interests: string[];
  note: string;
  total: number;
  existing: boolean;
}

/** The internal copy: what someone told us, in the order we care about it. */
export function signupNotification(input: NotifyInput): EmailMessage {
  const lines = [
    `${input.existing ? "Updated" : "New"} waiting-list signup — ${input.total} on the list.`,
    "",
    `Email:     ${input.email}`,
    `Name:      ${input.name || "—"}`,
    `Role:      ${input.role}`,
    `Country:   ${input.country || "—"}`,
    `Interests: ${input.interests.length ? input.interests.join(", ") : "—"}`,
    "",
    input.note ? `Note:\n${input.note}` : "No note.",
  ];

  return {
    to: input.to,
    replyTo: input.email,
    subject: `${input.existing ? "Updated" : "New"} waitlist signup: ${input.email} (#${input.total})`,
    text: lines.join("\n"),
    html: shell(
      "Waiting-list signup",
      `<p style="margin:0 0 14px;">${input.existing ? "Updated" : "New"} signup — <strong>${input.total}</strong> on the list.</p>
       <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
         ${[
           ["Email", input.email],
           ["Name", input.name || "—"],
           ["Role", input.role],
           ["Country", input.country || "—"],
           ["Interests", input.interests.length ? input.interests.join(", ") : "—"],
         ]
           .map(
             ([k, v]) =>
               `<tr><td style="padding:4px 16px 4px 0;color:${SLATE};">${k}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`,
           )
           .join("")}
       </table>
       ${input.note ? `<p style="margin:14px 0 0;white-space:pre-wrap;">${escapeHtml(input.note)}</p>` : ""}`,
      "Sent by the BoatXchange waiting-list endpoint.",
    ),
  };
}
