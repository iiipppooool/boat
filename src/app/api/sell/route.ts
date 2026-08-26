import { NextResponse } from "next/server";
import { SellSubmissionSchema, fieldErrors } from "@/lib/sell-schema";
import { createListing } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seller submissions. This is the inventory's real source: the seed file exists
 * only so a fresh install is not empty (see data/README.md), and everything
 * written here is marked `source = 'seller'`.
 *
 * Submissions land as `pending`, not `available`. A listing goes live once a
 * human has done the verification described on /about — for a market where a
 * single transaction can be £40,000, an unchecked instant-publish flow would be
 * the wrong default.
 */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = SellSubmissionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const today = new Date().toISOString().slice(0, 10);

  const { listing } = createListing({
    title: `${d.year} ${d.manufacturer} ${d.model}`.trim(),
    category: d.category,
    boatClass: d.boatClass ?? null,
    discipline: d.discipline ?? null,
    seats: d.seats ?? null,
    coxed: d.coxed ?? null,
    manufacturer: d.manufacturer,
    model: d.model,
    year: d.year,
    condition: d.condition,
    conditionGrade: d.conditionGrade,
    material: d.material,
    rigging: d.rigging ?? null,
    crewWeightMinKg: d.crewWeightMinKg ?? null,
    crewWeightMaxKg: d.crewWeightMaxKg ?? null,
    hullWeightKg: d.hullWeightKg ?? null,
    lengthCm: d.lengthCm ?? null,
    price: d.price,
    currency: d.currency,
    priceBasis: d.priceBasis,
    location: {
      city: d.city,
      region: d.region,
      country: d.country,
      countryCode: d.countryCode,
      continent: d.continent,
    },
    seller: {
      name: d.sellerName,
      type: d.sellerType,
      // Verification is a human step; a brand-new seller is never auto-verified.
      verified: false,
      memberSince: today.slice(0, 7),
      responseHours: 24,
    },
    status: "pending",
    listedAt: today,
    updatedAt: today,
    highlights: d.highlights,
    description: d.description,
    photoDirection:
      d.photoNotes ||
      "Seller has not yet supplied photographs. Requested: three-quarter bow view, full hull profile, rigger detail, and an honest close-up of every repair.",
  });

  return NextResponse.json({
    ok: true,
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
  });
}
