import { z } from "zod";

/**
 * The waiting-list contract, shared by the form and the API route so the two
 * cannot drift — same arrangement as the seller submission schema.
 *
 * Only the email address is required. Every extra field is a question we would
 * like answered, not a gate: a signup form that demands a name and a country
 * before it will take an email address loses more people than the answers are
 * worth.
 */

export const WAITLIST_ROLES = [
  "rower",
  "club",
  "coach",
  "dealer",
  "builder",
  "other",
] as const;

export const WAITLIST_ROLE_LABELS: Record<(typeof WAITLIST_ROLES)[number], string> = {
  rower: "I row",
  club: "I run or help run a club",
  coach: "I coach",
  dealer: "I deal or broker boats",
  builder: "I build boats or equipment",
  other: "Something else",
};

export const WAITLIST_INTERESTS = [
  "buy-boat",
  "sell-boat",
  "oars",
  "gear",
  "apparel",
  "safety",
  "rentals",
  "fleet",
] as const;

export const WAITLIST_INTEREST_LABELS: Record<(typeof WAITLIST_INTERESTS)[number], string> = {
  "buy-boat": "Buying a boat",
  "sell-boat": "Selling a boat",
  oars: "Oars & sculls",
  gear: "Gear & electronics",
  apparel: "Kit & merch",
  safety: "Helmets & safety",
  rentals: "Renting a boat",
  fleet: "Kitting out a club fleet",
};

export const WaitlistSchema = z.object({
  email: z.email("That does not look like an email address.").max(180),
  name: z.string().trim().max(90).optional().default(""),
  role: z.enum(WAITLIST_ROLES).optional().default("rower"),
  country: z.string().trim().max(80).optional().default(""),
  interests: z.array(z.enum(WAITLIST_INTERESTS)).max(WAITLIST_INTERESTS.length).optional().default([]),
  note: z.string().trim().max(1200).optional().default(""),
  updatesOptIn: z.boolean().optional().default(true),
  /**
   * Honeypot. A field no human sees and no human fills in; anything in it means
   * a bot, and the request is accepted with a cheerful 200 and thrown away.
   */
  website: z.string().max(200).optional().default(""),
});

export type WaitlistInput = z.infer<typeof WaitlistSchema>;

/** Flattens a Zod error into `{ field: message }` for the form to render. */
export function waitlistFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
