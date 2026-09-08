import { NextResponse } from "next/server";
import { z } from "zod";
import { unsubscribe } from "@/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LeaveSchema = z.object({ email: z.email().max(180) });

/**
 * Leaving the list.
 *
 * POST rather than a GET link that does the deed on click: mail clients and
 * link-preview bots follow GET URLs on their own, and somebody who merely
 * received the email should not be unsubscribed by their inbox fetching a
 * thumbnail. The email links to a page; the page asks; this confirms.
 *
 * The response never says whether the address was on the list. That answer
 * would turn this endpoint into a way of testing whether a given person had
 * signed up.
 */
export async function POST(request: Request) {
  const parsed = LeaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter the email address you signed up with." },
      { status: 400 },
    );
  }

  unsubscribe(parsed.data.email);
  return NextResponse.json({ ok: true });
}
