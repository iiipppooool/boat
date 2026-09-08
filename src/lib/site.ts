/**
 * Site-wide contact and identity details, in one place.
 *
 * Everything here is blank by default and on purpose. An earlier version of
 * this build carried an invented company number, VAT number, registered address
 * and phone number, which would have been false company information the moment
 * the site went live. They are gone.
 *
 * Fill in what is true. Anything left blank is simply not rendered. The footer
 * and contact page omit missing details rather than printing a placeholder, so
 * a half-configured site looks sparse rather than fraudulent.
 */
export interface SiteContact {
  /** General enquiries. Also used for the "Contact the seller" link on listings. */
  email: string;
  /** Optional department addresses. Omitted from /contact when blank. */
  verificationEmail: string;
  dealerEmail: string;
  pressEmail: string;
  /** E.164 for the link, plus how it should read on screen. */
  phone: string;
  phoneDisplay: string;
  /** Office hours line on /contact. Blank hides it. */
  hours: string;
}

export interface SiteSocial {
  label: string;
  href: string;
}

export const SITE = {
  name: "BoatXchange",
  /** Used for absolute URLs in metadata. Set this to your real domain. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  contact: {
    email: "",
    verificationEmail: "",
    dealerEmail: "",
    pressEmail: "",
    phone: "",
    phoneDisplay: "",
    hours: "",
  } satisfies SiteContact,

  social: [] as SiteSocial[],

  /**
   * Commission on a completed sale. Every one of these is a business decision,
   * so they live here rather than being scattered through the pages. The
   * pricing page, the account page and the invoicing endpoint all derive from
   * this, and cannot disagree with each other.
   *
   *   fee = min(salePrice * rate + flat, cap),  or 0 when salePrice < freeBelow
   *
   * Modelled against the current inventory's price distribution
   * (`npm run fees` prints the working):
   *
   *   2% + £10 flat          ~2.1% of GMV    45% effective rate on a £23 item
   *   5% flat                ~5.0% of GMV    £2,661 on a £53k eight
   *   2%, cap £600           ~1.8% of GMV    current setting
   *   5%, cap £1000          ~4.2% of GMV    touches only the 4 priciest boats
   *
   * Set to 2% because that is the rate that was asked for. To switch to the
   * model the numbers favour, set rate: 0.05, cap: 1000, freeBelow: 200.
   */
  fees: {
    rate: 0.02,
    /** Flat amount added to every invoiced sale. Regressive; see `npm run fees`. */
    flat: 0,
    /** Ceiling on a single commission. Set to Infinity for no cap. */
    cap: 600,
    /** Sale prices below this are not invoiced at all. */
    freeBelow: 750,
    currency: "GBP",
    currencySymbol: "£",
  },
} as const;

/** True when at least one way of contacting the business has been configured. */
export function hasContactDetails(): boolean {
  const { email, phone } = SITE.contact;
  return Boolean(email || phone);
}
