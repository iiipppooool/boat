/**
 * BoatXchange inventory schema — the single source of truth for the shape of a
 * listing. `data/seed-listings.json`, the SQLite table in `db.ts`, the Market
 * page, the Sell form and the AI Concierge all speak this vocabulary.
 */

export const CATEGORIES = [
  "shell", "oars", "rigging", "trailer", "apparel", "gear",
] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * `apparel` and `gear` are separate categories rather than one "everything
 * else" bucket, because they are searched on different things. Nobody filters
 * kit by hull material and nobody filters a cox box by chest size — apparel
 * needs sizes and a cut, gear needs a quantity and not much else.
 */
export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type ApparelSize = (typeof APPAREL_SIZES)[number];

/** Rowing kit is cut differently for men and women; a lot of it is neither. */
export const FITS = ["mens", "womens", "unisex"] as const;
export type Fit = (typeof FITS)[number];

/**
 * Boat classes use the standard rowing shorthand:
 *   1x single scull · 2x double · 4x quad · 2- coxless pair · 2+ coxed pair
 *   4- coxless four · 4+ coxed four · 4x+ coxed quad · 8+ eight (always coxed)
 * Coastal classes are separate because the hulls are a different discipline,
 * not a variant of the flat-water boat.
 */
export const BOAT_CLASSES = [
  "1x", "2x", "2-", "2+", "4x", "4x+", "4-", "4+", "8+",
  "coastal-1x", "coastal-2x", "coastal-4x+",
] as const;
export type BoatClass = (typeof BOAT_CLASSES)[number];

export const DISCIPLINES = ["sculling", "sweep", "coastal"] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const CONDITIONS = ["new", "used"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_GRADES = ["new", "excellent", "good", "fair"] as const;
export type ConditionGrade = (typeof CONDITION_GRADES)[number];

export const MATERIALS = [
  "carbon", "carbon-nomex", "carbon-honeycomb", "composite",
  "fibreglass", "wood", "aluminium", "steel",
  // Kit and gear. `electronics` is the honest answer for a cox box: the
  // material genuinely is not the interesting fact about it.
  "lycra", "polyester", "merino", "neoprene", "mixed-textile", "electronics",
] as const;
export type Material = (typeof MATERIALS)[number];

export const RIGGING_TYPES = [
  "conventional", "carbon-wing", "aluminium-wing", "back-mounted",
] as const;
export type RiggingType = (typeof RIGGING_TYPES)[number];

/**
 * `platform` marks stock BoatXchange owns and is reselling itself — boats bought
 * in to sell on, rather than listed on someone else's behalf. It is a seller
 * type rather than a hidden flag precisely so it shows: a marketplace that
 * quietly competes with its own sellers stops being trusted the moment anyone
 * notices, and someone always notices. Platform listings carry a visible badge
 * and are excluded from commission.
 */
export const SELLER_TYPES = [
  "private", "club", "dealer", "manufacturer", "platform",
] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export const LISTING_STATUSES = ["available", "pending", "sold"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const CURRENCIES = ["EUR", "USD", "GBP", "AUD", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PRICE_BASES = ["fixed", "ono", "poa"] as const;
/** `ono` = or nearest offer · `poa` = price on application (indicative only). */
export type PriceBasis = (typeof PRICE_BASES)[number];

export const CONTINENTS = [
  "Europe", "North America", "South America", "Oceania", "Asia", "Africa",
] as const;
export type Continent = (typeof CONTINENTS)[number];

export interface ListingLocation {
  city: string;
  region: string;
  country: string;
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  continent: Continent;
}

/**
 * A photograph of the actual item. Listings with photos render them; listings
 * without fall back to the generated illustration in `HullArt`.
 */
export interface ListingPhoto {
  /** Path under /public, or an absolute URL on a configured remote host. */
  src: string;
  /** What the photograph shows. Required — a marketplace photo always says something. */
  alt: string;
  /** Photographer or source, shown under the gallery when present. */
  credit?: string;
}

export interface ListingSeller {
  name: string;
  type: SellerType;
  /** True once BoatXchange has confirmed identity and ownership — see /about. */
  verified: boolean;
  /** YYYY-MM. */
  memberSince: string;
  /** Median first-reply time, in hours. */
  responseHours: number;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  category: Category;
  /** Null for equipment that is not tied to one boat class. */
  boatClass: BoatClass | null;
  discipline: Discipline | null;
  seats: number | null;
  coxed: boolean | null;
  manufacturer: string;
  model: string;
  year: number;
  condition: Condition;
  conditionGrade: ConditionGrade;
  material: Material;
  rigging: RiggingType | null;
  /** Manufacturer's per-rower weight band, in kg. The key sizing spec. */
  crewWeightMinKg: number | null;
  crewWeightMaxKg: number | null;
  hullWeightKg: number | null;
  lengthCm: number | null;
  /**
   * Sizes this listing covers. A single unisuit carries one; a club clearing
   * out a season's kit carries the whole spread, which is why this is a list
   * and not a field. Empty for anything that is not apparel.
   */
  sizes: ApparelSize[];
  /** Cut, for apparel. Null for everything else. */
  fit: Fit | null;
  /**
   * How many items are in the lot. Null means one, or not applicable — a boat
   * is a boat. Kit and gear are frequently sold in bulk, and "22 all-in-ones"
   * is a completely different proposition from one.
   */
  quantity: number | null;
  price: number;
  currency: Currency;
  priceBasis: PriceBasis;
  /**
   * Price normalised to USD so that a single price-range filter and a single
   * sort order work across a global marketplace. Derived at write time from the
   * FX snapshot in `fx.ts` — never entered by a seller.
   */
  priceUsd: number;
  location: ListingLocation;
  seller: ListingSeller;
  status: ListingStatus;
  /** YYYY-MM-DD. */
  listedAt: string;
  updatedAt: string;
  highlights: string[];
  description: string;
  /**
   * Photographs of this item, in display order. Empty means none yet, and the
   * generated illustration stands in — see `photoDirection` for what to shoot.
   */
  photos: ListingPhoto[];
  /** Art-direction brief for the photography that should replace generated artwork. */
  photoDirection: string;
  /** Deterministic seed for the duotone hull artwork stand-in. */
  artSeed: number;
  /** 'seed' = demo data shipped with the repo; 'seller' = submitted via /sell. */
  source: "seed" | "seller";
}

/** A listing as it exists in the seed file, before `priceUsd` is derived. */
export type SeedListing = Omit<Listing, "priceUsd">;

// --- Query surface ---------------------------------------------------------

export interface ListingQuery {
  q?: string;
  category?: Category[];
  boatClass?: BoatClass[];
  discipline?: Discipline[];
  condition?: Condition[];
  conditionGrade?: ConditionGrade[];
  material?: Material[];
  rigging?: RiggingType[];
  manufacturer?: string[];
  continent?: Continent[];
  sellerType?: SellerType[];
  status?: ListingStatus[];
  coxed?: boolean;
  seats?: number[];
  /** Matches listings offering any of these sizes. */
  sizes?: ApparelSize[];
  fit?: Fit[];
  /** Only lots — more than one item. Useful when kitting out a squad. */
  bulkOnly?: boolean;
  /** Inclusive bounds, in USD, against the normalised `priceUsd`. */
  minPriceUsd?: number;
  maxPriceUsd?: number;
  /** Returns boats whose weight band contains this per-rower weight, in kg. */
  fitsRowerKg?: number;
  verifiedOnly?: boolean;
  sort?: ListingSort;
  page?: number;
  perPage?: number;
}

export const LISTING_SORTS = [
  "newest", "oldest", "price-asc", "price-desc", "year-desc",
] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export interface ListingPage {
  listings: Listing[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

/** Counts used to label filter options and to show an at-a-glance market summary. */
export interface MarketFacets {
  manufacturers: { value: string; count: number }[];
  boatClasses: { value: string; count: number }[];
  continents: { value: string; count: number }[];
  categories: { value: string; count: number }[];
  total: number;
  availableTotal: number;
  priceUsdRange: { min: number; max: number };
}
