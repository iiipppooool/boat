import { NextResponse } from "next/server";
import { z } from "zod";
import { isSubscribed } from "@/lib/accounts";
import { getSessionAccount } from "@/lib/auth";
import { getListingBySlug } from "@/lib/inventory";
import { commissionFor } from "@/lib/fees";
import { toUsd } from "@/lib/fx";
import { PaymentsNotConfigured, getPaymentsProvider } from "@/lib/payments/provider";
import { CURRENCIES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  slug: z.string().min(1).max(120),
  /** What it actually sold for, which is often not the asking price. */
  salePrice: z.coerce.number().min(1).max(500_000),
  currency: z.enum(CURRENCIES),
});

/**
 * Raises a commission invoice for a completed sale.
 *
 * Called when a seller confirms a sale, not when a listing is marked sold,
 * those are different events, and only the seller knows the price that was
 * actually agreed.
 *
 * Three cases produce no invoice at all, and each returns 200 with a reason
 * rather than an error, because none of them is a failure:
 *   - the seller is on Boathouse, which includes commission
 *   - the sale price is below the free threshold
 *   - the listing is stock we own, so there is nobody to invoice
 */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { slug, salePrice, currency } = parsed.data;
  const listing = getListingBySlug(slug);
  if (!listing) return NextResponse.json({ error: "No such listing." }, { status: 404 });

  if (listing.seller.type === "platform") {
    return NextResponse.json({ invoiced: false, reason: "platform-owned", fee: 0 });
  }

  // Billing acts on the signed-in account and no other. Without a session there
  // is nobody to bill, so this is a 401 rather than a silent demo account.
  const account = await getSessionAccount();
  if (!account) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (isSubscribed(account)) {
    return NextResponse.json({ invoiced: false, reason: "boathouse-includes-commission", fee: 0 });
  }

  // The fee is defined in GBP, so convert via the same reference rates the
  // price filter uses. USD is the pivot because that is what `toUsd` gives.
  const salePriceGbp = toUsd(salePrice, currency) / toUsd(1, "GBP");
  const fee = commissionFor(salePriceGbp);

  if (fee.waived) {
    return NextResponse.json({ invoiced: false, reason: "below-threshold", fee: 0 });
  }
  if (!account.stripeCustomerId) {
    return NextResponse.json(
      { error: "This account has no Stripe customer yet, it has never been billed." },
      { status: 409 },
    );
  }

  try {
    const invoice = await getPaymentsProvider().invoiceCommission({
      customerId: account.stripeCustomerId,
      amountInPence: fee.amountInPence,
      description: `Commission on ${listing.title} (${listing.id})`,
      listingId: listing.id,
    });
    return NextResponse.json({
      invoiced: true,
      fee: fee.amount,
      capped: fee.capped,
      invoiceId: invoice.id,
      invoiceUrl: invoice.url,
    });
  } catch (error) {
    if (error instanceof PaymentsNotConfigured) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[billing] commission invoice failed", error);
    return NextResponse.json({ error: "Could not raise the invoice." }, { status: 502 });
  }
}
