import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { PaymentsNotConfigured, getPaymentsProvider } from "@/lib/payments/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens Stripe's hosted billing portal — card changes, invoice history and
 * cancellation all happen there rather than in screens we would have to build,
 * secure and keep in step with Stripe.
 */
export async function POST() {
  const payments = getPaymentsProvider();
  // Billing acts on the signed-in account and no other. Without a session there
  // is nobody to bill, so this is a 401 rather than a silent demo account.
  const account = await getSessionAccount();
  if (!account) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (!account.stripeCustomerId) {
    return NextResponse.json(
      { error: "There is no billing history on this account yet." },
      { status: 409 },
    );
  }

  try {
    const { url } = await payments.openBillingPortal(account.stripeCustomerId);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof PaymentsNotConfigured) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[billing] portal failed", error);
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 502 });
  }
}
