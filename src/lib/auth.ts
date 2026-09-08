import "server-only";
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { getAccountById, type Account } from "./accounts";

/**
 * Authentication.
 *
 * Written against Node's own crypto rather than a dependency, because the two
 * jobs here, hash a password properly, and sign a session id, are exactly the
 * two things `node:crypto` already does well, and an auth dependency is a thing
 * you then have to keep patched for the life of the product.
 *
 * ── Passwords ────────────────────────────────────────────────────────────────
 * scrypt with a per-password random salt, at parameters (N=2^15, r=8, p=1) that
 * cost roughly 100ms on a small instance. That is the point: slow enough that a
 * stolen database is not a wordlist away from being useful, fast enough that a
 * sign-in does not feel broken. Comparison is `timingSafeEqual`, so the check
 * takes the same time whether the first byte is wrong or the last.
 *
 * Stored as `scrypt$N$r$p$<salt hex>$<hash hex>`, the parameters travel with
 * the hash, so raising them later does not invalidate everyone's password.
 *
 * ── Sessions ─────────────────────────────────────────────────────────────────
 * A random 32-byte session id in a table, handed to the browser in an
 * httpOnly, SameSite=Lax, Secure-in-production cookie alongside an HMAC of
 * itself. The HMAC means a forged cookie is rejected without a database round
 * trip; the table means a session can actually be revoked, which a stateless
 * JWT cannot do.
 */

/**
 * `promisify` collapses scrypt's overloads onto the three-argument form, which
 * drops the options object we need to set the cost parameters. The cast pins
 * the four-argument signature back on.
 */
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64 };
export const SESSION_COOKIE = "bx_session";
const SESSION_DAYS = 60;

export const SESSIONS_SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry  ON sessions(expires_at);
`;

/** Columns added to `accounts` for real sign-in. Applied by db.ts on boot. */
export const ACCOUNT_AUTH_COLUMNS: [string, string][] = [
  ["password_hash", "TEXT NOT NULL DEFAULT ''"],
  ["email_verified_at", "TEXT"],
  ["last_login_at", "TEXT"],
];

/* -------------------------------------------------------------------------- */
/* Passwords                                                                   */
/* -------------------------------------------------------------------------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 128 * SCRYPT.N * SCRYPT.r * 2,
  }));

  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Checks a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed or empty stored hash, an
 * account created before passwords existed has an empty one, and that account
 * must simply be unable to sign in, not crash the endpoint.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (!salt.length || !expected.length) return false;

  const N = Number(n);
  const derived = (await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
    N,
    r: Number(r),
    p: Number(p),
    maxmem: 128 * N * Number(r) * 2,
  }));

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The key the session cookie is signed with.
 *
 * In production it must come from the environment: a key that changes on every
 * deploy signs everybody out, and a key baked into the image is not a secret.
 * Development falls back to a fixed string so `npm run dev` works with no setup,
 * and says so once rather than failing.
 */
let warnedAboutSecret = false;
function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters in production. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  if (!warnedAboutSecret) {
    console.warn("[auth] SESSION_SECRET unset, using a development-only key.");
    warnedAboutSecret = true;
  }
  return "development-only-session-key-do-not-use-in-production";
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex").slice(0, 32);
}

/** `<id>.<hmac>`; the hmac lets a forged cookie be rejected without a query. */
function packCookie(id: string): string {
  return `${id}.${sign(id)}`;
}

function unpackCookie(raw: string): string | null {
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(id);
  if (mac.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? id : null;
}

export async function createSession(accountId: string, userAgent = ""): Promise<void> {
  const id = randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);

  getDb()
    .prepare(
      `INSERT INTO sessions (id, account_id, created_at, expires_at, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, accountId, now.toISOString(), expires.toISOString(), userAgent.slice(0, 200));

  (await cookies()).set(SESSION_COOKIE, packCookie(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const id = unpackCookie(raw);
    if (id) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
  }
  store.delete(SESSION_COOKIE);
}

/**
 * The signed-in account, or null.
 *
 * Expired rows are deleted on the way past rather than by a scheduled job:
 * the only thing that ever looks at a session is this function, so the cleanup
 * belongs here and costs one DELETE on a session nobody can use anyway.
 */
export async function getSessionAccount(): Promise<Account | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const id = unpackCookie(raw);
  if (!id) return null;

  const row = getDb()
    .prepare("SELECT account_id, expires_at FROM sessions WHERE id = ?")
    .get(id) as { account_id: string; expires_at: string } | undefined;
  if (!row) return null;

  if (new Date(row.expires_at) <= new Date()) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }

  return getAccountById(row.account_id);
}

/* -------------------------------------------------------------------------- */
/* Registration and sign-in                                                    */
/* -------------------------------------------------------------------------- */

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  contactName?: string;
}

export type RegisterResult =
  | { ok: true; account: Account }
  | { ok: false; field: "email" | "password" | "form"; message: string };

export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();

  const existing = db.prepare("SELECT id FROM accounts WHERE email = ?").get(email);
  if (existing) {
    return {
      ok: false,
      field: "email",
      message: "There is already an account with that address. Sign in instead.",
    };
  }

  const id = `acct-${randomUUID()}`;
  db.prepare(
    `INSERT INTO accounts (id, name, contact_name, email, tier, created_at, password_hash)
     VALUES (?, ?, ?, ?, 'crew', ?, ?)`,
  ).run(
    id,
    input.name.trim() || email,
    (input.contactName ?? "").trim(),
    email,
    new Date().toISOString().slice(0, 10),
    await hashPassword(input.password),
  );

  const account = getAccountById(id);
  if (!account) return { ok: false, field: "form", message: "Could not create the account." };
  return { ok: true, account };
}

/**
 * Checks credentials.
 *
 * A wrong address and a wrong password give the same answer, and an unknown
 * address still costs a password hash, so the response time does not reveal
 * whether an account exists.
 */
export async function authenticate(email: string, password: string): Promise<Account | null> {
  const row = getDb()
    .prepare("SELECT id, password_hash FROM accounts WHERE email = ?")
    .get(email.trim().toLowerCase()) as { id: string; password_hash: string } | undefined;

  const stored = row?.password_hash || (await decoyHash());
  const valid = await verifyPassword(password, stored);
  if (!row || !valid) return null;

  getDb()
    .prepare("UPDATE accounts SET last_login_at = ? WHERE id = ?")
    .run(new Date().toISOString(), row.id);

  return getAccountById(row.id);
}

/** A real hash of a fixed string, so an unknown email costs the same work. */
let decoy: string | null = null;
async function decoyHash(): Promise<string> {
  if (!decoy) decoy = await hashPassword("there-is-no-account-with-this-address");
  return decoy;
}
