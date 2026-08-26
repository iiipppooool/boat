import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CONCIERGE_SYSTEM, buildMessages, referencedIds, retrieve,
} from "@/lib/ai/concierge";
import { getConciergeProvider } from "@/lib/ai/provider";
import { formatPrice } from "@/lib/fx";
import {
  BOAT_CLASS_LABELS, CATEGORY_LABELS, FIT_LABELS, GRADE_LABELS, MATERIAL_LABELS,
  SELLER_TYPE_LABELS, lotSize, sizeRange, weightBand,
} from "@/lib/format";
import type { ConciergeEvent, ConciergeListingRef } from "@/lib/ai/shared";
import type { Listing } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
  listing: z.string().max(120).nullish(),
});

/**
 * Crude per-IP throttle. Every request here costs money, so an unbounded
 * endpoint is a bill waiting to happen. In-process and therefore per-instance —
 * good enough for one small server, and the thing to replace with a shared
 * counter the day there is more than one.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // bounded memory; a blunt but honest reset
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many questions in a short time. Give it a minute." },
      { status: 429 },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { messages, listing } = parsed.data;
  const provider = getConciergeProvider();

  // Retrieval first, always. The model is only ever shown boats that exist.
  const retrieval = retrieve(messages, listing);
  const prompt = buildMessages(messages, retrieval);

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, event: ConciergeEvent) =>
    controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        send(controller, {
          type: "context",
          listings: retrieval.listings.map(toRef),
          provider: provider.id,
          model: provider.model,
          live: provider.live,
        });

        let answer = "";
        for await (const delta of provider.stream({
          system: CONCIERGE_SYSTEM,
          messages: prompt,
        })) {
          answer += delta;
          send(controller, { type: "delta", text: delta });
        }

        send(controller, {
          type: "done",
          referenced: referencedIds(answer, retrieval.listings),
        });
      } catch (error) {
        console.error("[concierge] generation failed", error);
        send(controller, {
          type: "error",
          message:
            "The concierge could not reach the model just now. The listings above are real and current — browse them directly, or try again shortly.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function toRef(l: Listing): ConciergeListingRef {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    manufacturer: l.manufacturer,
    category: l.category,
    boatClassLabel: l.boatClass ? BOAT_CLASS_LABELS[l.boatClass] : CATEGORY_LABELS[l.category],
    condition: l.condition,
    conditionLabel: GRADE_LABELS[l.conditionGrade],
    materialLabel: MATERIAL_LABELS[l.material],
    weightBand: weightBand(l.crewWeightMinKg, l.crewWeightMaxKg),
    hullWeightKg: l.hullWeightKg,
    sizeRange: sizeRange(l.sizes),
    fitLabel: l.fit ? FIT_LABELS[l.fit] : null,
    lotSize: lotSize(l.quantity),
    priceLabel: formatPrice(l.price, l.currency),
    priceNote:
      l.priceBasis === "ono" ? "or near offer" : l.priceBasis === "poa" ? "indicative" : null,
    location: `${l.location.city}, ${l.location.country}`,
    sellerLabel: SELLER_TYPE_LABELS[l.seller.type],
    verified: l.seller.verified,
    status: l.status,
    artSeed: l.artSeed,
  };
}
