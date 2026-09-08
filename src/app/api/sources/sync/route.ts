import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncAllSources, getSourceStatus } from "@/lib/sources/sync";
import { getSources } from "@/lib/sources/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A full sync can walk ten queries across several sources. Give it room. */
export const maxDuration = 300;

/**
 * The refresh that keeps aggregated listings current.
 *
 * It is an endpoint rather than a timer inside the process because the thing
 * that should decide "every hour" is the platform, not the app: Vercel Cron,
 * a Fly scheduled machine, a GitHub Action or plain `curl` from anywhere all
 * drive it the same way, and none of them break when the app restarts.
 *
 *   curl -X POST https://yoursite/api/sources/sync -H "authorization: Bearer $SYNC_TOKEN"
 *
 * GET reports state and needs no token, because "when did the market last
 * update" is something the site itself shows to buyers.
 */

function authorised(request: Request): boolean {
  const token = process.env.SYNC_TOKEN;
  // Without a token configured the endpoint refuses rather than running open:
  // an unauthenticated writer is worse than a market that has not refreshed.
  if (!token) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Vercel Cron sends its own header; accept either.
  const cron = request.headers.get("x-vercel-cron-signature") ? token : "";
  return bearer === token || cron === token;
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: process.env.SYNC_TOKEN
          ? "Bad or missing token."
          : "SYNC_TOKEN is not set, so this endpoint is disabled.",
      },
      { status: 401 },
    );
  }

  const sources = getSources();
  if (!sources.length) {
    return NextResponse.json({
      ok: true,
      sources: [],
      note:
        "No aggregation sources are configured. Set EBAY_CLIENT_ID and " +
        "EBAY_CLIENT_SECRET, or DEALER_FEEDS, and run this again.",
    });
  }

  const results = await syncAllSources();

  // The market, the home page and every listing page read this data, so they
  // are all rebuilt rather than waiting out their revalidate window.
  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath("/market/[slug]", "page");

  return NextResponse.json({ ok: true, sources: results });
}

export async function GET() {
  return NextResponse.json({
    configured: getSources().map((source) => source.name),
    status: getSourceStatus(),
  });
}
