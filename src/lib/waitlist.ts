import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";

/**
 * The waiting list.
 *
 * Before there is a market there is a list of people who want one, and this is
 * the only table in the product that exists purely to measure demand. It is
 * kept deliberately small and deliberately honest: an email address, what the
 * person rows, what they want from us, and when they asked. No tracking
 * identifiers, no fingerprint, nothing we could not read out to the person it
 * belongs to.
 *
 * Two rules shape the schema:
 *
 *   1. Email is UNIQUE and stored lower-cased. Someone who signs up twice
 *      updates their answers rather than creating a second row, so the count on
 *      the landing page is a count of people rather than a count of clicks.
 *   2. `unsubscribed_at` is a timestamp, not a delete. If someone leaves the
 *      list we have to remember that they did, or the next import puts them
 *      back on it.
 */

export const WAITLIST_SCHEMA = `
CREATE TABLE IF NOT EXISTS waitlist (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'rower',
  country         TEXT NOT NULL DEFAULT '',
  interests       TEXT NOT NULL DEFAULT '[]',  -- JSON array
  note            TEXT NOT NULL DEFAULT '',
  updates_opt_in  INTEGER NOT NULL DEFAULT 1,
  referrer        TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  confirmed_at    TEXT,
  unsubscribed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_role    ON waitlist(role);
`;

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string;
  role: string;
  country: string;
  interests: string[];
  note: string;
  updatesOptIn: boolean;
  referrer: string;
  createdAt: string;
  updatedAt: string;
  unsubscribedAt: string | null;
}

interface WaitlistRow {
  id: string; email: string; name: string; role: string; country: string;
  interests: string; note: string; updates_opt_in: number; referrer: string;
  created_at: string; updated_at: string; confirmed_at: string | null;
  unsubscribed_at: string | null;
}

function toEntry(r: WaitlistRow): WaitlistEntry {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    country: r.country,
    interests: JSON.parse(r.interests || "[]") as string[],
    note: r.note,
    updatesOptIn: r.updates_opt_in === 1,
    referrer: r.referrer,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    unsubscribedAt: r.unsubscribed_at,
  };
}

export interface JoinInput {
  email: string;
  name?: string;
  role?: string;
  country?: string;
  interests?: string[];
  note?: string;
  updatesOptIn?: boolean;
  referrer?: string;
}

export interface JoinResult {
  entry: WaitlistEntry;
  /** True when this email was already on the list — the caller should say so. */
  existing: boolean;
  /** 1-based position, counted by signup order. */
  position: number;
}

/**
 * Adds someone to the list, or updates them if they are already on it.
 *
 * Re-signing up is treated as an edit rather than an error: people forget, and
 * a second attempt is usually somebody correcting the club they put in the
 * first time. `created_at` is preserved so their place in the queue survives.
 */
export function joinWaitlist(input: JoinInput): JoinResult {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const before = db.prepare("SELECT * FROM waitlist WHERE email = ?").get(email) as
    | WaitlistRow
    | undefined;

  if (before) {
    db.prepare(
      `UPDATE waitlist SET
         name           = CASE WHEN ? <> '' THEN ? ELSE name END,
         role           = ?,
         country        = CASE WHEN ? <> '' THEN ? ELSE country END,
         interests      = ?,
         note           = CASE WHEN ? <> '' THEN ? ELSE note END,
         updates_opt_in = ?,
         updated_at     = ?,
         unsubscribed_at = NULL
       WHERE email = ?`,
    ).run(
      input.name ?? "", input.name ?? "",
      input.role ?? before.role,
      input.country ?? "", input.country ?? "",
      JSON.stringify(input.interests ?? JSON.parse(before.interests || "[]")),
      input.note ?? "", input.note ?? "",
      input.updatesOptIn === false ? 0 : 1,
      now,
      email,
    );
  } else {
    db.prepare(
      `INSERT INTO waitlist (
         id, email, name, role, country, interests, note,
         updates_opt_in, referrer, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      email,
      input.name ?? "",
      input.role ?? "rower",
      input.country ?? "",
      JSON.stringify(input.interests ?? []),
      input.note ?? "",
      input.updatesOptIn === false ? 0 : 1,
      (input.referrer ?? "").slice(0, 300),
      now,
      now,
    );
  }

  const row = db.prepare("SELECT * FROM waitlist WHERE email = ?").get(email) as WaitlistRow;
  const position = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM waitlist WHERE created_at <= ? AND unsubscribed_at IS NULL",
      )
      .get(row.created_at) as { n: number }
  ).n;

  return { entry: toEntry(row), existing: Boolean(before), position };
}

export function unsubscribe(email: string): boolean {
  const result = getDb()
    .prepare(
      "UPDATE waitlist SET unsubscribed_at = ?, updated_at = ? WHERE email = ? AND unsubscribed_at IS NULL",
    )
    .run(new Date().toISOString(), new Date().toISOString(), email.trim().toLowerCase());
  return result.changes > 0;
}

export function waitlistCount(): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS n FROM waitlist WHERE unsubscribed_at IS NULL")
      .get() as { n: number }
  ).n;
}

/**
 * What the landing page shows.
 *
 * The signup count is real, and that is the point — but a real number is a
 * small number on day one, and "3 people are waiting" is worse than saying
 * nothing. `showCount` is the honest way through: below the floor the page
 * omits the figure entirely rather than inflating it.
 */
export interface WaitlistStats {
  count: number;
  showCount: boolean;
  countries: number;
}

const COUNT_FLOOR = 25;

export function waitlistStats(): WaitlistStats {
  const db = getDb();
  const count = waitlistCount();
  const countries = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT country) AS n FROM waitlist WHERE country <> '' AND unsubscribed_at IS NULL",
      )
      .get() as { n: number }
  ).n;
  return { count, showCount: count >= COUNT_FLOOR, countries };
}

export function listWaitlist(limit = 1000): WaitlistEntry[] {
  return (
    getDb()
      .prepare("SELECT * FROM waitlist ORDER BY created_at ASC LIMIT ?")
      .all(limit) as WaitlistRow[]
  ).map(toEntry);
}
