import { z } from "zod";
import type { AggregatedListing, SourceAdapter } from "./types";
import {
  BOAT_CLASSES, CATEGORIES, CONDITIONS, CONDITION_GRADES, CONTINENTS,
  CURRENCIES, DISCIPLINES, MATERIALS, PRICE_BASES,
} from "@/lib/types";

/**
 * A dealer's or club's own feed.
 *
 * The second legitimate route into the market, and in practice the better one:
 * a dealer who wants their stock in front of buyers will hand over a JSON URL
 * after a five-minute conversation, and the data is far richer than anything a
 * general marketplace API returns, because they hold the actual spec sheets.
 *
 * Configure with a comma-separated list of feeds, each `Name|https://url`:
 *
 *   DEALER_FEEDS="Ruhr Rowing Supply|https://ruhr.example/feed.json,Tyne Boats|https://tyne.example/stock.json"
 *
 * The feed is somebody else's file, so it is validated rather than trusted: a
 * row that does not parse is dropped and counted, and a feed that is entirely
 * malformed yields nothing instead of writing rubbish into the market. That is
 * the whole reason for the schema below rather than a cast.
 */

const FeedItemSchema = z.object({
  id: z.string().min(1).max(120),
  url: z.url(),
  title: z.string().trim().min(3).max(200),
  category: z.enum(CATEGORIES),
  boatClass: z.enum(BOAT_CLASSES).nullish(),
  discipline: z.enum(DISCIPLINES).nullish(),
  manufacturer: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 2),
  condition: z.enum(CONDITIONS).default("used"),
  conditionGrade: z.enum(CONDITION_GRADES).default("good"),
  material: z.enum(MATERIALS).default("composite"),
  crewWeightMinKg: z.coerce.number().min(30).max(140).nullish(),
  crewWeightMaxKg: z.coerce.number().min(30).max(160).nullish(),
  hullWeightKg: z.coerce.number().min(1).max(250).nullish(),
  lengthCm: z.coerce.number().int().min(100).max(2200).nullish(),
  price: z.coerce.number().min(1).max(500_000),
  currency: z.enum(CURRENCIES),
  priceBasis: z.enum(PRICE_BASES).default("fixed"),
  city: z.string().trim().max(80).default(""),
  region: z.string().trim().max(80).default(""),
  country: z.string().trim().min(2).max(80),
  countryCode: z.string().trim().length(2).toUpperCase(),
  continent: z.enum(CONTINENTS),
  description: z.string().trim().max(4000).default(""),
  highlights: z.array(z.string().trim().max(120)).max(4).default([]),
  photos: z.array(z.object({ src: z.url(), alt: z.string().max(200).default("") })).max(12).default([]),
  listedAt: z.string().max(30).optional(),
});

const FeedSchema = z.union([
  z.array(FeedItemSchema),
  z.object({ listings: z.array(FeedItemSchema) }),
]);

type FeedItem = z.infer<typeof FeedItemSchema>;

function toListing(item: FeedItem, sourceName: string): AggregatedListing {
  const today = new Date().toISOString().slice(0, 10);
  return {
    externalId: `feed-${sourceName.toLowerCase().replace(/\W+/g, "-")}-${item.id}`,
    sourceUrl: item.url,
    sourceName,
    title: item.title,
    category: item.category,
    boatClass: item.boatClass ?? null,
    discipline: item.discipline ?? null,
    seats: null,
    coxed: null,
    manufacturer: item.manufacturer,
    model: item.model,
    year: item.year,
    condition: item.condition,
    conditionGrade: item.conditionGrade,
    material: item.material,
    rigging: null,
    crewWeightMinKg: item.crewWeightMinKg ?? null,
    crewWeightMaxKg: item.crewWeightMaxKg ?? null,
    hullWeightKg: item.hullWeightKg ?? null,
    lengthCm: item.lengthCm ?? null,
    sizes: [],
    fit: null,
    quantity: null,
    price: item.price,
    currency: item.currency,
    priceBasis: item.priceBasis,
    location: {
      city: item.city,
      region: item.region,
      country: item.country,
      countryCode: item.countryCode,
      continent: item.continent,
    },
    seller: {
      name: sourceName,
      type: "dealer",
      verified: false,
      memberSince: "",
      responseHours: 24,
    },
    status: "available",
    listedAt: (item.listedAt ?? today).slice(0, 10),
    updatedAt: today,
    highlights: item.highlights.length ? item.highlights : [`Stock of ${sourceName}`],
    description:
      item.description ||
      `This boat is listed by ${sourceName}. Follow the link for their full ` +
        `description, current price and photographs.`,
    photos: item.photos.map((photo) => ({
      src: photo.src,
      alt: photo.alt || item.title,
      credit: sourceName,
      stock: false,
    })),
    photoDirection: `Photographs supplied by ${sourceName}.`,
  };
}

/** Parses `Name|url,Name|url` into adapters. Malformed entries are skipped loudly. */
export function feedAdapters(): SourceAdapter[] {
  const raw = process.env.DEALER_FEEDS?.trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const split = entry.indexOf("|");
      if (split < 1) {
        console.error(`[sources:feed] ignoring "${entry}", expected "Name|https://url".`);
        return null;
      }
      const name = entry.slice(0, split).trim();
      const url = entry.slice(split + 1).trim();

      const adapter: SourceAdapter = {
        name,
        async fetchListings() {
          try {
            const response = await fetch(url, {
              headers: { accept: "application/json" },
              signal: AbortSignal.timeout(20_000),
            });
            if (!response.ok) {
              console.error(`[sources:feed] ${name} returned ${response.status}`);
              return [];
            }

            const parsed = FeedSchema.safeParse(await response.json());
            if (!parsed.success) {
              console.error(`[sources:feed] ${name}: feed did not match the expected shape.`);
              return [];
            }

            const items = Array.isArray(parsed.data) ? parsed.data : parsed.data.listings;
            return items.map((item) => toListing(item, name));
          } catch (error) {
            console.error(`[sources:feed] ${name} failed:`, error);
            return [];
          }
        },
      };
      return adapter;
    })
    .filter((adapter): adapter is SourceAdapter => adapter !== null);
}
