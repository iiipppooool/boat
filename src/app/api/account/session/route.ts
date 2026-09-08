import { NextResponse } from "next/server";
import { SignInSchema } from "@/lib/account-schema";
import { authenticate, createSession, destroySession, getSessionAccount } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who is signed in. Returns `{ account: null }` rather than a 401 — the header
 *  and the landing page both ask this on a page nobody needs to be signed in for. */
export async function GET() {
  const account = await getSessionAccount();
  return NextResponse.json({
    account: account ? { name: account.name, email: account.email, tier: account.tier } : null,
  });
}

/** Sign in. */
export async function POST(request: Request) {
  const parsed = SignInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter your email address and password." },
      { status: 400 },
    );
  }

  const account = await authenticate(parsed.data.email, parsed.data.password);
  if (!account) {
    // One message for both failures: saying which was wrong tells an attacker
    // whether the address is registered.
    return NextResponse.json(
      { ok: false, error: "That email address and password do not match an account." },
      { status: 401 },
    );
  }

  await createSession(account.id, request.headers.get("user-agent") ?? "");
  return NextResponse.json({ ok: true, name: account.name, email: account.email });
}

/** Sign out. */
export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
