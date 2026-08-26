import "server-only";
import Stripe from "stripe";
import { SITE } from "@/lib/site";

/**
 * The single place BoatXchange talks to a payment processor.
 *
 * Same shape as the AI provider: one adapter behind one interface, so the
 * routes and the account page never import Stripe directly and swapping
 * processor means writing one class rather than touching the UI.
 *
 * Without `STRIPE_SECRET_KEY` this returns a disabled provider whose calls
 * refuse cleanly instead of throwing. That keeps the account page working on a
 * fresh clone and makes "billing is not configured" a state the UI can render,
 * rather than a 500.
 */

export interface CheckoutResult {
  url: string;
}

export interface CommissionInvoice {
  id: string;
  url: string | null;
  amount: number;
}

export class PaymentsNotConfigured extends Error {
  constructor() {
    super(
      "Billing is not configured. Set STRIPE_SECRET_KEY and STRIPE_BOATHOUSE_PRICE_ID to enable it.",
    );
    this.name = "PaymentsNotConfigured";
  }
}

export interface PaymentsProvider {
  readonly enabled: boolean;
  /** Starts a Boathouse subscription. Returns a URL to redirect the seller to. */
  startSubscription(input: {
    accountId: string;
    email: string;
    customerId?: string | null;
  }): Promise<CheckoutResult>;
  /** Stripe-hosted page for changing card, viewing invoices and cancelling. */
  openBillingPortal(customerId: string): Promise<CheckoutResult>;
  /** Raises a 2% commission invoice against a completed sale. */
  invoiceCommission(input: {
    customerId: string;
    amountInPence: number;
    description: string;
    listingId: string;
  }): Promise<CommissionInvoice>;
  verifyWebhook(payload: string, signature: string): Promise<Stripe.Event>;
}

class StripePayments implements PaymentsProvider {
  readonly enabled = true;
  #stripe: Stripe;
  #priceId: string;
  #webhookSecret: string;

  constructor(secretKey: string, priceId: string, webhookSecret: string) {
    this.#stripe = new Stripe(secretKey);
    this.#priceId = priceId;
    this.#webhookSecret = webhookSecret;
  }

  async startSubscription({
    accountId, email, customerId,
  }: {
    accountId: string;
    email: string;
    customerId?: string | null;
  }): Promise<CheckoutResult> {
    const session = await this.#stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: this.#priceId, quantity: 1 }],
      success_url: `${SITE.url}/account?checkout=success`,
      cancel_url: `${SITE.url}/pricing?checkout=cancelled`,
      // Both are set so the webhook can find the account whichever field
      // Stripe echoes back for a given event type.
      client_reference_id: accountId,
      metadata: { accountId },
      subscription_data: { metadata: { accountId } },
      ...(customerId ? { customer: customerId } : { customer_email: email }),
    });

    if (!session.url) throw new Error("Stripe returned a checkout session with no URL");
    return { url: session.url };
  }

  async openBillingPortal(customerId: string): Promise<CheckoutResult> {
    const session = await this.#stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE.url}/account`,
    });
    return { url: session.url };
  }

  async invoiceCommission({
    customerId, amountInPence, description, listingId,
  }: {
    customerId: string;
    amountInPence: number;
    description: string;
    listingId: string;
  }): Promise<CommissionInvoice> {
    // Invoice first, then attach the line item to it. Creating the item without
    // an invoice id leaves it floating on the customer, where it would be swept
    // into whatever invoice happens to be drafted next — including a
    // subscription renewal.
    const invoice = await this.#stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 30,
      description,
      metadata: { listingId, kind: "commission" },
    });
    if (!invoice.id) throw new Error("Stripe returned an invoice with no id");

    await this.#stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: amountInPence,
      currency: SITE.fees.currency.toLowerCase(),
      description,
    });

    const finalised = await this.#stripe.invoices.finalizeInvoice(invoice.id);
    return {
      id: finalised.id ?? invoice.id,
      url: finalised.hosted_invoice_url ?? null,
      amount: amountInPence / 100,
    };
  }

  async verifyWebhook(payload: string, signature: string): Promise<Stripe.Event> {
    // Async variant: uses WebCrypto, so it works on Node and on edge runtimes.
    return this.#stripe.webhooks.constructEventAsync(payload, signature, this.#webhookSecret);
  }
}

class DisabledPayments implements PaymentsProvider {
  readonly enabled = false;
  async startSubscription(): Promise<CheckoutResult> { throw new PaymentsNotConfigured(); }
  async openBillingPortal(): Promise<CheckoutResult> { throw new PaymentsNotConfigured(); }
  async invoiceCommission(): Promise<CommissionInvoice> { throw new PaymentsNotConfigured(); }
  async verifyWebhook(): Promise<Stripe.Event> { throw new PaymentsNotConfigured(); }
}

let cached: PaymentsProvider | null = null;

export function getPaymentsProvider(): PaymentsProvider {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_BOATHOUSE_PRICE_ID;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  cached = secretKey && priceId
    ? new StripePayments(secretKey, priceId, webhookSecret)
    : new DisabledPayments();
  return cached;
}
