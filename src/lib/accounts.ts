import "server-only";
import { getDb } from "./db";

/**
 * Seller accounts and their subscription state.
 *
 * Deliberately thin: Stripe is the source of truth for whether a subscription
 * is live, and this table is a local cache of what the webhook last told us.
 * Nothing here decides whether someone has paid, it records what Stripe said.
 *
 * Who is signed in is decided in `auth.ts`, `getSessionAccount()`, and every
 * page and route uses that. `getCurrentAccount()` below survives only as the
 * demo-account fallback used by scripts and local poking; nothing user-facing
 * calls it.
 */

export const ACCOUNTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  contact_name           TEXT NOT NULL DEFAULT '',
  email                  TEXT NOT NULL,
  tier                   TEXT NOT NULL DEFAULT 'crew',   -- 'crew' | 'boathouse'
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  subscription_status    TEXT,                            -- Stripe's own status string
  current_period_end     TEXT,
  created_at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_customer ON accounts(stripe_customer_id);
`;

export interface Account {
  id: string;
  name: string;
  contactName: string;
  email: string;
  tier: "crew" | "boathouse";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

interface AccountRow {
  id: string; name: string; contact_name: string; email: string; tier: string;
  stripe_customer_id: string | null; stripe_subscription_id: string | null;
  subscription_status: string | null; current_period_end: string | null; created_at: string;
}

function toAccount(r: AccountRow): Account {
  return {
    id: r.id,
    name: r.name,
    contactName: r.contact_name,
    email: r.email,
    tier: r.tier as Account["tier"],
    stripeCustomerId: r.stripe_customer_id,
    stripeSubscriptionId: r.stripe_subscription_id,
    subscriptionStatus: r.subscription_status,
    currentPeriodEnd: r.current_period_end,
    createdAt: r.created_at,
  };
}

const DEMO_ACCOUNT_ID = "acct-demo";

/**
 * The signed-in seller. With no auth layer this is a single demo account,
 * created on first read so the account page has something to render.
 */
export function getCurrentAccount(): Account {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM accounts WHERE id = ?").get(DEMO_ACCOUNT_ID) as
    | AccountRow
    | undefined;
  if (existing) return toAccount(existing);

  db.prepare(
    `INSERT INTO accounts (id, name, contact_name, email, tier, created_at)
     VALUES (?, ?, ?, ?, 'crew', ?)`,
  ).run(
    DEMO_ACCOUNT_ID,
    "Your account",
    "",
    "you@example.com",
    new Date().toISOString().slice(0, 10),
  );
  return getCurrentAccount();
}

export function getAccountById(id: string): Account | null {
  const row = getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(id) as
    | AccountRow
    | undefined;
  return row ? toAccount(row) : null;
}

export function getAccountByCustomerId(customerId: string): Account | null {
  const row = getDb()
    .prepare("SELECT * FROM accounts WHERE stripe_customer_id = ?")
    .get(customerId) as AccountRow | undefined;
  return row ? toAccount(row) : null;
}

/**
 * Records what Stripe told us. Called only from the webhook, never from a
 * page or a checkout redirect, because a redirect proves the buyer reached the
 * success URL and nothing more.
 */
export function updateSubscription(
  accountId: string,
  input: {
    customerId?: string | null;
    subscriptionId?: string | null;
    status?: string | null;
    currentPeriodEnd?: string | null;
  },
): void {
  // 'active' and 'trialing' are the two Stripe states that mean "let them in".
  // Everything else, past_due, unpaid, canceled, incomplete, does not.
  const entitled = input.status === "active" || input.status === "trialing";

  getDb()
    .prepare(
      `UPDATE accounts SET
         stripe_customer_id     = COALESCE(?, stripe_customer_id),
         stripe_subscription_id = COALESCE(?, stripe_subscription_id),
         subscription_status    = COALESCE(?, subscription_status),
         current_period_end     = COALESCE(?, current_period_end),
         tier                   = ?
       WHERE id = ?`,
    )
    .run(
      input.customerId ?? null,
      input.subscriptionId ?? null,
      input.status ?? null,
      input.currentPeriodEnd ?? null,
      entitled ? "boathouse" : "crew",
      accountId,
    );
}

export function isSubscribed(account: Account): boolean {
  return account.tier === "boathouse";
}
