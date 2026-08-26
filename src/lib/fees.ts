import { SITE } from "./site";

/**
 * Commission, in one place.
 *
 * The pricing page, the account page and the invoicing endpoint all call this,
 * so what a seller is quoted and what they are billed cannot drift apart. The
 * rate, flat component, cap and free threshold are all set in `src/lib/site.ts`.
 *
 *   fee = min(salePrice * rate + flat, cap),  or 0 when salePrice < freeBelow
 */
export interface FeeBreakdown {
  /** What is actually owed, in GBP. */
  amount: number;
  /** Before the cap and the waiver, for showing the working. */
  gross: number;
  capped: boolean;
  waived: boolean;
  /** In minor units, which is what Stripe wants. */
  amountInPence: number;
}

/** Sale prices below this are not invoiced at all. */
export const FREE_BELOW = SITE.fees.freeBelow;

/** The sale price at which the cap starts biting. Infinity when uncapped. */
export const CAP_BITES_ABOVE =
  SITE.fees.rate > 0 ? (SITE.fees.cap - SITE.fees.flat) / SITE.fees.rate : Infinity;

export function commissionFor(salePriceGbp: number): FeeBreakdown {
  const gross = round2(salePriceGbp * SITE.fees.rate + SITE.fees.flat);

  if (salePriceGbp < FREE_BELOW) {
    return { amount: 0, gross, capped: false, waived: true, amountInPence: 0 };
  }

  const capped = gross > SITE.fees.cap;
  const amount = round2(capped ? SITE.fees.cap : gross);
  return {
    amount,
    gross,
    capped,
    waived: false,
    amountInPence: Math.round(amount * 100),
  };
}

/** "2%", or "2% + £10" when a flat component is configured. */
export function rateLabel(): string {
  const pct = `${round2(SITE.fees.rate * 100)}%`;
  return SITE.fees.flat > 0
    ? `${pct} + ${SITE.fees.currencySymbol}${SITE.fees.flat}`
    : pct;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatFee(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: SITE.fees.currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
