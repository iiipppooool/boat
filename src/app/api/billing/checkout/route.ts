import { NextResponse } from "next/server";
import { getCurrentAccount, isSubscribed } from "@/lib/accounts";
import { PaymentsNotConfigured, getPaymentsProvider } from "@/lib/payments/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Starts a Boathouse subscription and returns the Stripe Checkout URL. */
export async function POST() {
  const payments = getPaymentsProvider();
  const account = getCurrentAccount();

  if (isSubscribed(account)) {
    return NextResponse.json(
      { error: "This account is already on Boathouse." },
      { status: 409 },
    );
  }

  try {
    const { url } = await payments.startSubscription({
      accountId: account.id,
      email: account.email,
      customerId: account.stripeCustomerId,
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof PaymentsNotConfigured) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[billing] checkout failed", error);
    return NextResponse.json(
      { error: "Could not start checkout. Try again shortly." },
      { status: 502 },
    );
  }
}
