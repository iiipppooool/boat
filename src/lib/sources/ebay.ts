import type { AggregatedListing, SourceAdapter } from "./types";
import type { BoatClass, Category, Condition, Currency, Discipline, Material } from "@/lib/types";

/**
 * eBay, through the official Browse API.
 *
 * This is the one aggregation source that is available to anybody without a
 * commercial conversation first: register at developer.ebay.com, get a client
 * id and secret, and the Browse API returns live listings with terms that
 * permit displaying them so long as you link back. That link-back is not a
 * courtesy, it is the deal, and it is why every listing this adapter produces
 * carries sourceUrl and is rendered as a signpost rather than as our stock.
 *
 * Configure with:
 *   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET      from developer.ebay.com
 *   EBAY_MARKETPLACE                        default EBAY_GB
 *
 * With no credentials the adapter is simply not registered, so the market is
 * unchanged rather than broken.
 *
 * What this adapter deliberately does not do is guess. eBay listings carry a
 * title, a price and a photograph, and almost never a crew weight band or a
 * layup. Rather than invent those fields to make a listing look complete, every
 * spec it cannot read stays null, and the listing page shows the gaps. A buyer
 * who can see that the weight band is unknown is better served than one shown a
 * confident number somebody made up.
 */

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

/**
 * What to ask eBay for.
 *
 * Each query is paired with the category it maps onto, because "rowing oars"
 * and "rowing shell" want to land in different parts of the market. The
 * queries are narrow on purpose: a broad "rowing" search returns exercise
 * machines, rowing-club memorabilia and inflatable dinghies.
 */
const QUERIES: { q: string; category: Category; boatClass?: BoatClass; discipline?: Discipline }[] = [
  { q: "rowing single scull boat", category: "shell", boatClass: "1x", discipline: "sculling" },
  { q: "rowing double scull boat", category: "shell", boatClass: "2x", discipline: "sculling" },
  { q: "coastal rowing boat", category: "shell", discipline: "coastal" },
  { q: "sculling oars pair", category: "oars" },
  { q: "sweep rowing blades", category: "oars" },
  { q: "rowing rigger", category: "rigging" },
  { q: "coxbox rowing", category: "gear" },
  { q: "concept2 rowing ergometer", category: "gear" },
  { q: "rowing all in one kit", category: "apparel" },
  { q: "boat trailer rowing", category: "trailer" },
];

/** Manufacturers worth spotting in a title, so the listing is filterable. */
const MAKERS = [
  "Empacher", "Filippi", "Hudson", "Vespoli", "Wintech", "Swift", "Sykes",
  "Janousek", "Stampfli", "Salani", "Peinert", "Fluidesign", "Concept2",
  "Croker", "Braca", "Dreissigacker", "Liteboat", "Virus", "Edon",
];

interface EbayItem {
  itemId?: string;
  title?: string;
  itemWebUrl?: string;
  price?: { value?: string; currency?: string };
  image?: { imageUrl?: string };
  thumbnailImages?: { imageUrl?: string }[];
  condition?: string;
  itemLocation?: { country?: string; city?: string; stateOrProvince?: string };
  itemCreationDate?: string;
  seller?: { username?: string; feedbackPercentage?: string };
}

let cachedToken: { value: string; expires: number } | null = null;

/**
 * eBay's client-credentials token, cached until shortly before it expires.
 *
 * The 60-second margin matters: a token that expires between being fetched and
 * being used produces a 401 halfway through a sync, which is a much more
 * confusing failure than simply asking for a new one.
 */
async function getToken(id: string, secret: string): Promise<string | null> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!response.ok) {
    console.error(`[sources:ebay] token request failed: ${response.status} ${await response.text()}`);
    return null;
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  cachedToken = {
    value: data.access_token,
    expires: Date.now() + (data.expires_in ?? 7200) * 1000,
  };
  return cachedToken.value;
}

function makerFrom(title: string): string {
  const found = MAKERS.find((maker) => title.toLowerCase().includes(maker.toLowerCase()));
  return found ?? "Unbranded";
}

/** A four-digit year in the title, when there is a plausible one. */
function yearFrom(title: string): number {
  const thisYear = new Date().getFullYear();
  const match = title.match(/\b(19[6-9]\d|20[0-4]\d)\b/);
  const year = match ? Number(match[1]) : NaN;
  return Number.isFinite(year) && year <= thisYear + 1 ? year : thisYear;
}

function materialFrom(title: string): Material {
  const t = title.toLowerCase();
  if (t.includes("carbon")) return "carbon";
  if (t.includes("wood") || t.includes("cedar") || t.includes("mahogany")) return "wood";
  if (t.includes("fibreglass") || t.includes("fiberglass") || t.includes("glass")) return "fibreglass";
  if (t.includes("aluminium") || t.includes("aluminum")) return "aluminium";
  return "composite";
}

/** eBay's condition strings onto ours. Anything unrecognised is "used". */
function conditionFrom(raw: string | undefined): { condition: Condition; grade: "new" | "excellent" | "good" | "fair" } {
  const c = (raw ?? "").toLowerCase();
  if (c.includes("new")) return { condition: "new", grade: "new" };
  if (c.includes("open box") || c.includes("excellent")) return { condition: "used", grade: "excellent" };
  if (c.includes("very good") || c.includes("good")) return { condition: "used", grade: "good" };
  return { condition: "used", grade: "fair" };
}

/** Country code onto the continent buckets the market filters on. */
const CONTINENT_BY_COUNTRY: Record<string, AggregatedListing["location"]["continent"]> = {
  GB: "Europe", IE: "Europe", DE: "Europe", NL: "Europe", FR: "Europe", IT: "Europe",
  ES: "Europe", PL: "Europe", CH: "Europe", AT: "Europe", BE: "Europe", DK: "Europe",
  SE: "Europe", NO: "Europe", CZ: "Europe", PT: "Europe",
  US: "North America", CA: "North America", MX: "North America",
  AU: "Oceania", NZ: "Oceania",
  ZA: "Africa", EG: "Africa",
  JP: "Asia", CN: "Asia", HK: "Asia", SG: "Asia", IN: "Asia",
  BR: "South America", AR: "South America", CL: "South America",
};

const CURRENCIES = new Set(["GBP", "EUR", "USD", "AUD", "CAD", "CHF"]);

function toListing(
  item: EbayItem,
  query: (typeof QUERIES)[number],
  marketplace: string,
): AggregatedListing | null {
  const title = item.title?.trim();
  const url = item.itemWebUrl;
  const price = Number(item.price?.value);
  const currency = item.price?.currency;

  // No title, no link or no price means it is not a listing we can show. Drop
  // it rather than filling the gaps in.
  if (!title || !url || !item.itemId || !Number.isFinite(price) || price <= 0) return null;
  if (!currency || !CURRENCIES.has(currency)) return null;

  const country = item.itemLocation?.country ?? "GB";
  const continent = CONTINENT_BY_COUNTRY[country] ?? "Europe";
  const { condition, grade } = conditionFrom(item.condition);
  const photo = item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl;
  const today = new Date().toISOString().slice(0, 10);

  return {
    externalId: `ebay-${item.itemId}`,
    sourceUrl: url,
    sourceName: "eBay",
    title,
    category: query.category,
    boatClass: query.boatClass ?? null,
    discipline: query.discipline ?? null,
    seats: null,
    coxed: null,
    manufacturer: makerFrom(title),
    model: title.slice(0, 80),
    year: yearFrom(title),
    condition,
    conditionGrade: grade,
    material: materialFrom(title),
    rigging: null,
    // Everything below is genuinely unknown from an eBay summary. It stays
    // unknown; the listing page says so rather than showing a made-up figure.
    crewWeightMinKg: null,
    crewWeightMaxKg: null,
    hullWeightKg: null,
    lengthCm: null,
    sizes: [],
    fit: null,
    quantity: null,
    price,
    currency: currency as Currency,
    priceBasis: "fixed",
    location: {
      city: item.itemLocation?.city ?? "",
      region: item.itemLocation?.stateOrProvince ?? "",
      country,
      countryCode: country,
      continent,
    },
    seller: {
      name: item.seller?.username ?? "eBay seller",
      type: "private",
      // Nobody on an aggregated feed has been verified by us, and saying
      // otherwise would be the single most damaging lie this product could tell.
      verified: false,
      memberSince: "",
      responseHours: 48,
    },
    status: "available",
    listedAt: (item.itemCreationDate ?? today).slice(0, 10),
    updatedAt: today,
    highlights: [`Listed on eBay ${marketplace.replace("EBAY_", "")}`],
    description:
      `This listing is on eBay, not on BoatXchange. We show it so you can find it; ` +
      `the sale, the price and the seller are eBay's. Follow the link for the ` +
      `current price, the full description and the seller's own photographs.`,
    photos: photo
      ? [{ src: photo, alt: title, credit: "eBay listing photograph", stock: false }]
      : [],
    photoDirection: "Photograph comes from the eBay listing.",
  };
}

async function search(token: string, marketplace: string, query: (typeof QUERIES)[number]) {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", query.q);
  url.searchParams.set("limit", "30");
  url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE|AUCTION}");

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplace,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error(`[sources:ebay] "${query.q}" failed: ${response.status}`);
    return [];
  }

  const data = (await response.json()) as { itemSummaries?: EbayItem[] };
  return (data.itemSummaries ?? [])
    .map((item) => toListing(item, query, marketplace))
    .filter((listing): listing is AggregatedListing => listing !== null);
}

export function ebayAdapter(): SourceAdapter | null {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return null;

  const marketplace = process.env.EBAY_MARKETPLACE || "EBAY_GB";

  return {
    name: "eBay",
    async fetchListings() {
      try {
        const token = await getToken(id, secret);
        if (!token) return [];

        // Sequential rather than parallel: eBay rate-limits by application, and
        // ten simultaneous searches is the shape of request that gets throttled.
        const all: AggregatedListing[] = [];
        for (const query of QUERIES) {
          all.push(...(await search(token, marketplace, query)));
        }

        // One id can come back from two queries. First wins.
        const seen = new Set<string>();
        return all.filter((listing) => {
          if (seen.has(listing.externalId)) return false;
          seen.add(listing.externalId);
          return true;
        });
      } catch (error) {
        console.error("[sources:ebay] sync failed:", error);
        return [];
      }
    },
  };
}
