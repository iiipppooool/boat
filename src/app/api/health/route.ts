import { NextResponse } from "next/server";
import { getFacets } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness and readiness in one endpoint, for whatever is watching the
 * container. It deliberately touches the database: a process that is up but
 * cannot read its own inventory is not healthy, and a check that only proves
 * Node is running would keep routing traffic to it.
 */
export async function GET() {
  try {
    const facets = getFacets();
    return NextResponse.json({
      status: "ok",
      listings: facets.total,
      available: facets.availableTotal,
    });
  } catch (error) {
    console.error("[health] database unreachable", error);
    return NextResponse.json({ status: "error", error: "database unreachable" }, { status: 503 });
  }
}
