import { NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/account-schema";
import { waitlistFieldErrors } from "@/lib/waitlist-schema";
import { registerAccount, createSession } from "@/lib/auth";
import { joinWaitlist } from "@/lib/waitlist";
import { sendQuietly, notifyAddress } from "@/lib/email/provider";
import { signupNotification, welcomeEmail } from "@/lib/email/templates";
import { waitlistStats } from "@/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creating an account.
 *
 * The account is the thing that must succeed; the waiting-list row and both
 * emails are afterwards and best-effort, for the same reason as the waiting-list
 * endpoint, a mail outage should cost a confirmation, not a customer.
 *
 * A session is issued straight away rather than after an email confirmation.
 * The account cannot yet do anything that would be dangerous in the wrong hands
 * (listing still goes through human verification), and an unverified-email
 * limbo state at signup is where most registrations are abandoned.
 */
export async function POST(request: Request) {
  const parsed = RegisterSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: waitlistFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot. Answer as if it worked, create nothing.
  if (data.website.trim()) {
    return NextResponse.json({ ok: true, name: data.name, position: null });
  }

  const created = await registerAccount({
    email: data.email,
    password: data.password,
    name: data.name,
  });

  if (!created.ok) {
    return NextResponse.json(
      { ok: false, errors: { [created.field]: created.message } },
      { status: 409 },
    );
  }

  await createSession(created.account.id, request.headers.get("user-agent") ?? "");

  let position: number | null = null;
  if (data.joinWaitlist) {
    const joined = joinWaitlist({
      email: created.account.email,
      name: created.account.name,
      country: data.country,
      referrer: request.headers.get("referer") ?? "",
    });
    const stats = waitlistStats();
    position = stats.showCount ? joined.position : null;

    await sendQuietly(
      welcomeEmail({
        email: created.account.email,
        name: created.account.name,
        position: joined.position,
        showPosition: stats.showCount,
      }),
    );

    const notify = notifyAddress();
    if (notify) {
      await sendQuietly(
        signupNotification({
          to: notify,
          email: created.account.email,
          name: created.account.name,
          role: "account",
          country: data.country,
          interests: [],
          note: "Created an account from the landing page.",
          total: stats.count,
          existing: joined.existing,
        }),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    name: created.account.name,
    email: created.account.email,
    position,
  });
}
