import { NextResponse } from "next/server";
import { WaitlistSchema, waitlistFieldErrors } from "@/lib/waitlist-schema";
import { joinWaitlist, waitlistCount, waitlistStats } from "@/lib/waitlist";
import { sendQuietly, notifyAddress } from "@/lib/email/provider";
import { signupNotification, welcomeEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Waiting-list signup.
 *
 * The order of operations is the point: the database write happens first and is
 * the only thing allowed to fail the request. Both emails are sent afterwards
 * and best-effort, because a bounced confirmation is an annoyance while a lost
 * signup is a lost customer. The response says whether the confirmation went
 * out so the form can adjust what it promises the person.
 */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = WaitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: waitlistFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot: bots fill in every field they find. Answer as if it worked.
  if (data.website.trim()) {
    return NextResponse.json({ ok: true, position: null, existing: false, emailed: false });
  }

  const { entry, existing, position } = joinWaitlist({
    email: data.email,
    name: data.name,
    role: data.role,
    country: data.country,
    interests: [...data.interests],
    note: data.note,
    updatesOptIn: data.updatesOptIn,
    referrer: request.headers.get("referer") ?? "",
  });

  const stats = waitlistStats();

  const welcome = await sendQuietly(
    welcomeEmail({
      email: entry.email,
      name: entry.name,
      position,
      showPosition: stats.showCount,
    }),
  );

  const notify = notifyAddress();
  if (notify) {
    await sendQuietly(
      signupNotification({
        to: notify,
        email: entry.email,
        name: entry.name,
        role: entry.role,
        country: entry.country,
        interests: entry.interests,
        note: entry.note,
        total: waitlistCount(),
        existing,
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    existing,
    position: stats.showCount ? position : null,
    total: stats.showCount ? stats.count : null,
    emailed: welcome.ok,
  });
}
