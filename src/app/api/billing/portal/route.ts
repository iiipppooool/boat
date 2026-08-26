import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/accounts";
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
  const account = getCurrentAccount();

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
