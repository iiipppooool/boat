import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getAccountByCustomerId, updateSubscription } from "@/lib/accounts";
import { PaymentsNotConfigured, getPaymentsProvider } from "@/lib/payments/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. This is the only thing that grants or removes Boathouse
 * access.
 *
 * The checkout success redirect deliberately does not: reaching a success URL
 * proves the browser followed a link, not that money moved. Anyone can visit
 * `/account?checkout=success`.
 *
 * The raw request body is required for signature verification — parsing it as
 * JSON first would change the bytes and every signature would fail.
 */
export async function POST(request: Request) {
  const payments = getPaymentsProvider();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await payments.verifyWebhook(await request.text(), signature);
  } catch (error) {
    if (error instanceof PaymentsNotConfigured) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    // A bad signature is either a misconfigured secret or someone poking the
    // endpoint. Either way, never act on it.
    console.warn("[billing] webhook signature rejected", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const accountId = session.client_reference_id ?? session.metadata?.accountId;
        if (accountId) {
          updateSubscription(accountId, {
            customerId: asId(session.customer),
            subscriptionId: asId(session.subscription),
            // Checkout completing means paid; the subscription.* events that
            // follow carry the authoritative status from then on.
            status: "active",
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = asId(subscription.customer);
        const accountId =
          subscription.metadata?.accountId ??
          (customerId ? getAccountByCustomerId(customerId)?.id : undefined);

        if (accountId) {
          updateSubscription(accountId, {
            customerId,
            subscriptionId: subscription.id,
            status:
              event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
            currentPeriodEnd: periodEnd(subscription),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = asId(invoice.customer);
        const account = customerId ? getAccountByCustomerId(customerId) : null;
        // Do not downgrade here. Stripe retries failed payments for days and
        // emits customer.subscription.updated when it gives up; acting on the
        // first failure would lock out sellers whose card simply expired.
        if (account) console.warn(`[billing] payment failed for ${account.id}`);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // database problem — but log loudly, because a persistent failure here
    // means entitlements silently stop tracking reality.
    console.error(`[billing] failed handling ${event.type}`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Stripe fields are `string | {id} | null` depending on expansion. */
function asId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** `current_period_end` moved onto subscription items in recent API versions. */
function periodEnd(subscription: Stripe.Subscription): string | null {
  const seconds = subscription.items?.data?.[0]?.current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString().slice(0, 10) : null;
}
