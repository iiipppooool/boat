/**
 * Site-wide contact and identity details, in one place.
 *
 * Everything here is blank by default and on purpose. An earlier version of
 * this build carried an invented company number, VAT number, registered address
 * and phone number, which would have been false company information the moment
 * the site went live. They are gone.
 *
 * Fill in what is true. Anything left blank is simply not rendered — the footer
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
   * Commission on a completed sale, and the bounds around it.
   * `cap` stops the fee reading as a disincentive on the most expensive boats;
   * `floor` is the fee below which it is not worth raising an invoice at all.
   */
  fees: {
    rate: 0.02,
    ratePercent: "2%",
    cap: 600,
    floor: 15,
    currency: "GBP",
    currencySymbol: "£",
  },
} as const;

/** True when at least one way of contacting the business has been configured. */
export function hasContactDetails(): boolean {
  const { email, phone } = SITE.contact;
  return Boolean(email || phone);
}
