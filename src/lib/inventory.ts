import "server-only";
import { getDb, insertListingRow, rowToListing, withPriceUsd, type ListingRow } from "./db";
import type {
  Listing, ListingPage, ListingQuery, MarketFacets, SeedListing,
} from "./types";

/**
 * The inventory repository, the only module in the app that writes SQL.
 *
 * The Market grid, the listing detail page, the home page's featured strip and
 * the AI Concierge's retrieval step all call in here, so a listing that is
 * created, edited or marked sold changes everywhere at once. Swapping SQLite
 * for Postgres means rewriting this file and `db.ts`; nothing else moves.
 */

const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 48;

interface WhereClause {
  sql: string;
  params: unknown[];
}

function buildWhere(query: ListingQuery): WhereClause {
  const clauses: string[] = [];
  const params: unknown[] = [];

  const inClause = (column: string, values: readonly (string | number)[] | undefined) => {
    if (!values?.length) return;
    clauses.push(`${column} IN (${values.map(() => "?").join(", ")})`);
    params.push(...values);
  };

  inClause("category", query.category);
  inClause("boat_class", query.boatClass);
  inClause("discipline", query.discipline);
  inClause("condition", query.condition);
  inClause("condition_grade", query.conditionGrade);
  inClause("material", query.material);
  inClause("rigging", query.rigging);
  inClause("manufacturer", query.manufacturer);
  inClause("continent", query.continent);
  inClause("seller_type", query.sellerType);
  inClause("seats", query.seats);

  // Default to hiding sold boats: a marketplace that leads with sold stock
  // wastes the buyer's time. Sold listings stay reachable by explicit filter
  // and by direct link, because recent sale prices are useful evidence.
  inClause("status", query.status?.length ? query.status : ["available", "pending"]);

  if (query.coxed !== undefined) {
    clauses.push("coxed = ?");
    params.push(query.coxed ? 1 : 0);
  }

  inClause("fit", query.fit);

  // Sizes live in a JSON array because one apparel listing can cover a spread.
  // json_each unrolls it so "show me anything in L" matches a club lot that
  // happens to include an L, not just listings that are only L.
  if (query.sizes?.length) {
    clauses.push(
      `EXISTS (SELECT 1 FROM json_each(listings.sizes)
               WHERE json_each.value IN (${query.sizes.map(() => "?").join(", ")}))`,
    );
    params.push(...query.sizes);
  }

  if (query.bulkOnly) clauses.push("quantity > 1");
  if (query.verifiedOnly) clauses.push("seller_verified = 1");

  if (query.minPriceUsd != null) {
    clauses.push("price_usd >= ?");
    params.push(query.minPriceUsd);
  }
  if (query.maxPriceUsd != null) {
    clauses.push("price_usd <= ?");
    params.push(query.maxPriceUsd);
  }

  // Boats whose manufacturer weight band contains this rower. Equipment has no
  // band and is excluded from a weight-filtered search rather than guessed at.
  if (query.fitsRowerKg != null) {
    clauses.push("crew_weight_min IS NOT NULL AND crew_weight_min <= ? AND crew_weight_max >= ?");
    params.push(query.fitsRowerKg, query.fitsRowerKg);
  }

  if (query.q?.trim()) {
    clauses.push("id IN (SELECT id FROM listings_fts WHERE listings_fts MATCH ?)");
    params.push(toFtsQuery(query.q));
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

/**
 * Turns free text into a safe FTS5 prefix query. Every token is quoted, so
 * user input can never be read as FTS operator syntax (`NEAR`, `-`, `"` …).
 */
function toFtsQuery(input: string): string {
  const tokens = input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1)
    .slice(0, 8);
  if (!tokens.length) return '""';
  return tokens.map((t) => `"${t}"*`).join(" AND ");
}

const SORT_SQL: Record<NonNullable<ListingQuery["sort"]>, string> = {
  newest: "listed_at DESC, id DESC",
  oldest: "listed_at ASC, id ASC",
  "price-asc": "price_usd ASC, id ASC",
  "price-desc": "price_usd DESC, id DESC",
  "year-desc": "year DESC, listed_at DESC",
};

/** Paginated, filtered listing search. Pagination is done in SQL, not in JS. */
export function searchListings(query: ListingQuery = {}): ListingPage {
  const db = getDb();
  const where = buildWhere(query);

  const perPage = Math.min(Math.max(query.perPage ?? DEFAULT_PER_PAGE, 1), MAX_PER_PAGE);
  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM listings ${where.sql}`)
    .get(...where.params) as { total: number };

  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(query.page ?? 1, 1), pageCount);
  const order = SORT_SQL[query.sort ?? "newest"];

  const rows = db
    .prepare(`SELECT * FROM listings ${where.sql} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...where.params, perPage, (page - 1) * perPage) as ListingRow[];

  return { listings: rows.map(rowToListing), total, page, perPage, pageCount };
}

export function getListingBySlug(slug: string): Listing | null {
  const row = getDb().prepare("SELECT * FROM listings WHERE slug = ?").get(slug) as
    | ListingRow
    | undefined;
  return row ? rowToListing(row) : null;
}

export function getListingsByIds(ids: string[]): Listing[] {
  if (!ids.length) return [];
  const rows = getDb()
    .prepare(`SELECT * FROM listings WHERE id IN (${ids.map(() => "?").join(", ")})`)
    .all(...ids) as ListingRow[];
  const byId = new Map(rows.map((r) => [r.id, rowToListing(r)]));
  return ids.map((id) => byId.get(id)).filter((l): l is Listing => Boolean(l));
}

export function getAllSlugs(): string[] {
  const rows = getDb().prepare("SELECT slug FROM listings").all() as { slug: string }[];
  return rows.map((r) => r.slug);
}

/** Facet counts for the filter panel and the market summary strip. */
export function getFacets(): MarketFacets {
  const db = getDb();
  const live = "WHERE status IN ('available', 'pending')";

  const countBy = (column: string) =>
    db
      .prepare(
        `SELECT ${column} AS value, COUNT(*) AS count FROM listings
         ${live} AND ${column} IS NOT NULL
         GROUP BY ${column} ORDER BY count DESC, value ASC`,
      )
      .all() as { value: string; count: number }[];

  const { total } = db.prepare("SELECT COUNT(*) AS total FROM listings").get() as { total: number };
  const { availableTotal } = db
    .prepare(`SELECT COUNT(*) AS availableTotal FROM listings ${live}`)
    .get() as { availableTotal: number };
  const range = db
    .prepare(`SELECT MIN(price_usd) AS min, MAX(price_usd) AS max FROM listings ${live}`)
    .get() as { min: number | null; max: number | null };

  return {
    manufacturers: countBy("manufacturer"),
    boatClasses: countBy("boat_class"),
    continents: countBy("continent"),
    categories: countBy("category"),
    total,
    availableTotal,
    priceUsdRange: { min: range.min ?? 0, max: range.max ?? 0 },
  };
}

/** Recently listed or freshly updated boats, for the home page. */
export function getFeaturedListings(limit = 6): Listing[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM listings WHERE status = 'available'
       ORDER BY updated_at DESC, listed_at DESC LIMIT ?`,
    )
    .all(limit) as ListingRow[];
  return rows.map(rowToListing);
}

/**
 * Every listing belonging to one seller, newest first. Powers the "your
 * listings" table on the account page, which reads the same rows the Market
 * page does, so a boat marked sold changes in both places at once.
 */
export function getListingsBySeller(sellerName: string): Listing[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM listings
       WHERE json_extract(seller, '$.name') = ?
       ORDER BY listed_at DESC`,
    )
    .all(sellerName) as ListingRow[];
  return rows.map(rowToListing);
}

/** Same class or same maker, excluding the boat being viewed. */
export function getRelatedListings(listing: Listing, limit = 3): Listing[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM listings
       WHERE id != ? AND status = 'available'
         AND (boat_class = ? OR manufacturer = ?)
       ORDER BY (boat_class = ?) DESC, ABS(price_usd - ?) ASC
       LIMIT ?`,
    )
    .all(
      listing.id,
      listing.boatClass,
      listing.manufacturer,
      listing.boatClass,
      listing.priceUsd,
      limit,
    ) as ListingRow[];
  return rows.map(rowToListing);
}

export interface CreateListingResult {
  listing: Listing;
}

/**
 * Writes a seller submission. In v1 every submission lands as `pending`, it is
 * visible to the seller and to BoatXchange, and goes live once the verification
 * check described on /about is done. That check is a human step today.
 */
export function createListing(input: Omit<SeedListing, "id" | "slug" | "source" | "artSeed">): CreateListingResult {
  const db = getDb();
  const id = `bx-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  const slug = uniqueSlug(
    `${input.year}-${input.manufacturer}-${input.model}-${input.location.city}`,
  );

  const listing = withPriceUsd({
    ...input,
    id,
    slug,
    artSeed: hashToSeed(id),
    source: "seller",
  });

  insertListingRow(db, listing);
  return { listing };
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(base: string): string {
  const db = getDb();
  const root = slugify(base) || "listing";
  const exists = db.prepare("SELECT 1 FROM listings WHERE slug = ?");
  let candidate = root;
  let n = 2;
  while (exists.get(candidate)) candidate = `${root}-${n++}`;
  return candidate;
}

function hashToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}
