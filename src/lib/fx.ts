import type { Currency } from "./types";

/**
 * Static FX snapshot, used only to normalise listing prices to USD so that one
 * price filter and one sort order work across a marketplace that quotes in five
 * currencies.
 *
 * This is deliberately a frozen snapshot rather than a live feed: a listing's
 * position in a price filter should not silently move because the euro had a
 * bad afternoon. Prices are always *displayed* in the seller's own currency,
 * `priceUsd` is an internal sorting key, never shown as a quote.
 *
 * Replace with a daily rate job (ECB reference rates are free and sufficient)
 * writing into a `fx_rates` table, and re-derive `priceUsd` on the same
 * schedule. Snapshot date: 2026-08-01.
 */
export const FX_SNAPSHOT_DATE = "2026-08-01";

const RATES_TO_USD: Record<Currency, number> = {
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  AUD: 0.66,
  CAD: 0.73,
};

export function toUsd(amount: number, currency: Currency): number {
  return Math.round(amount * RATES_TO_USD[currency]);
}

const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  AUD: "en-AU",
  CAD: "en-CA",
};

/** Formats a price in the seller's own currency, with no fractional units. */
export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsdApprox(amountUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
}
