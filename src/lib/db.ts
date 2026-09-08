import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import seedListings from "../../data/seed-listings.json";
import { ACCOUNTS_SCHEMA } from "./accounts";
import { WAITLIST_SCHEMA } from "./waitlist";
import { SESSIONS_SCHEMA, ACCOUNT_AUTH_COLUMNS } from "./auth";
import { syncPhotos } from "./photos";
import { toUsd } from "./fx";
import type { Listing, SeedListing } from "./types";

/**
 * SQLite is the whole database tier, on purpose.
 *
 * A rowing-boat marketplace is a small-write, read-mostly application: a few
 * hundred listings, a handful of submissions a day, and every query answered
 * from one table. SQLite on a single small instance with a mounted volume
 * serves that for the cost of the instance, and it keeps the local development
 * story to `npm install && npm run dev` with no services to start.
 *
 * When write volume or multi-region reads justify it, the swap is contained:
 * everything above this file talks to the repository functions in
 * `inventory.ts`, not to SQL. Replacing this module with a Postgres pool means
 * rewriting the queries in `inventory.ts` and nothing else — no page, no
 * component and no API route reaches into the database directly.
 */

let db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS listings (
  id                TEXT PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL,
  boat_class        TEXT,
  discipline        TEXT,
  seats             INTEGER,
  coxed             INTEGER,
  manufacturer      TEXT NOT NULL,
  model             TEXT NOT NULL,
  year              INTEGER NOT NULL,
  condition         TEXT NOT NULL,
  condition_grade   TEXT NOT NULL,
  material          TEXT NOT NULL,
  rigging           TEXT,
  crew_weight_min   REAL,
  crew_weight_max   REAL,
  hull_weight_kg    REAL,
  length_cm         INTEGER,
  sizes             TEXT NOT NULL DEFAULT '[]',  -- JSON array, apparel only
  fit               TEXT,
  quantity          INTEGER,
  price             REAL NOT NULL,
  currency          TEXT NOT NULL,
  price_basis       TEXT NOT NULL,
  price_usd         REAL NOT NULL,
  location          TEXT NOT NULL,  -- JSON
  continent         TEXT NOT NULL,  -- denormalised from location for filtering
  country           TEXT NOT NULL,  -- denormalised from location for filtering
  seller            TEXT NOT NULL,  -- JSON
  seller_type       TEXT NOT NULL,  -- denormalised for filtering
  seller_verified   INTEGER NOT NULL,
  status            TEXT NOT NULL,
  listed_at         TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  highlights        TEXT NOT NULL,  -- JSON array
  description       TEXT NOT NULL,
  photos            TEXT NOT NULL DEFAULT '[]',  -- JSON array of ListingPhoto
  photo_direction   TEXT NOT NULL,
  art_seed          INTEGER NOT NULL,
  source            TEXT NOT NULL,
  source_url        TEXT,
  source_name       TEXT
);

CREATE INDEX IF NOT EXISTS idx_listings_status      ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category    ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_class       ON listings(boat_class);
CREATE INDEX IF NOT EXISTS idx_listings_price_usd   ON listings(price_usd);
CREATE INDEX IF NOT EXISTS idx_listings_updated     ON listings(updated_at);
CREATE INDEX IF NOT EXISTS idx_listings_manufacturer ON listings(manufacturer);

/* Free-text search across the fields a buyer actually types into a search box. */
CREATE VIRTUAL TABLE IF NOT EXISTS listings_fts USING fts5(
  id UNINDEXED, title, manufacturer, model, description, highlights,
  tokenize = 'unicode61'
);
`;

export function getDb(): Database.Database {
  if (db) return db;

  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "var", "boatxchange.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });

  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  db.exec(ACCOUNTS_SCHEMA);
  db.exec(WAITLIST_SCHEMA);
  db.exec(SESSIONS_SCHEMA);
  migrate(db);
  seed(db);
  // Photographs live on disk, not in the seed file: drop files into
  // public/listings/<slug>/ and they are picked up here on the next start.
  syncPhotos(db);

  return db;
}

/**
 * `CREATE TABLE IF NOT EXISTS` does nothing to a table that already exists, so
 * a database created before a column was added would be missing it. Adding the
 * apparel and gear columns to an existing install is exactly that case.
 *
 * Every column added here must be nullable or carry a default — SQLite will not
 * add a NOT NULL column without one, and more importantly a seller's existing
 * listing has no sensible value for a column invented after they wrote it.
 */
function migrate(database: Database.Database): void {
  migrateColumns(database, "accounts", ACCOUNT_AUTH_COLUMNS);

  const existing = new Set(
    (database.pragma("table_info(listings)") as { name: string }[]).map((c) => c.name),
  );

  const added: [string, string][] = [
    ["sizes", "TEXT NOT NULL DEFAULT '[]'"],
    ["fit", "TEXT"],
    ["quantity", "INTEGER"],
    ["photos", "TEXT NOT NULL DEFAULT '[]'"],
    ["source_url", "TEXT"],
    ["source_name", "TEXT"],
  ];

  migrateColumns(database, "listings", added);
}

/** Adds any of `columns` that the table does not already have. */
function migrateColumns(
  database: Database.Database,
  table: string,
  columns: [string, string][],
): void {
  const existing = new Set(
    (database.pragma(`table_info(${table})`) as { name: string }[]).map((c) => c.name),
  );
  for (const [column, definition] of columns) {
    if (!existing.has(column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
}

/**
 * Loads `data/seed-listings.json`. The JSON file is demo inventory, not
 * production data — see `data/README.md`. Real listings arrive through /sell
 * and are written with `source = 'seller'`, so the seed rows can be deleted
 * later without touching anything else.
 *
 * This tops up by id rather than only filling an empty database: when new seed
 * listings are added to the JSON — a new category, say — they appear on the
 * next boot without anyone having to wipe a database that already holds real
 * seller submissions. Seed rows already present are left alone, so a local edit
 * to a seed listing is not stamped back over on every restart.
 */
function seed(database: Database.Database): void {
  const rows = seedListings as unknown as SeedListing[];
  const known = new Set(
    (database.prepare("SELECT id FROM listings").all() as { id: string }[]).map((r) => r.id),
  );
  const missing = rows.filter((row) => !known.has(row.id));
  if (!missing.length) return;

  const insertMany = database.transaction((items: SeedListing[]) => {
    for (const item of items) insertListingRow(database, withPriceUsd(item));
  });
  insertMany(missing);
}

/** Derives the internal USD sort key. Never trust a client-supplied `priceUsd`. */
export function withPriceUsd(listing: SeedListing): Listing {
  return { ...listing, priceUsd: toUsd(listing.price, listing.currency) };
}

export function insertListingRow(database: Database.Database, l: Listing): void {
  database
    .prepare(
      `INSERT INTO listings (
        id, slug, title, category, boat_class, discipline, seats, coxed,
        manufacturer, model, year, condition, condition_grade, material, rigging,
        crew_weight_min, crew_weight_max, hull_weight_kg, length_cm,
        sizes, fit, quantity,
        price, currency, price_basis, price_usd,
        location, continent, country, seller, seller_type, seller_verified,
        status, listed_at, updated_at, highlights, description, photos,
        photo_direction, art_seed, source, source_url, source_name
      ) VALUES (
        @id, @slug, @title, @category, @boat_class, @discipline, @seats, @coxed,
        @manufacturer, @model, @year, @condition, @condition_grade, @material, @rigging,
        @crew_weight_min, @crew_weight_max, @hull_weight_kg, @length_cm,
        @sizes, @fit, @quantity,
        @price, @currency, @price_basis, @price_usd,
        @location, @continent, @country, @seller, @seller_type, @seller_verified,
        @status, @listed_at, @updated_at, @highlights, @description, @photos,
        @photo_direction, @art_seed, @source, @source_url, @source_name
      )`,
    )
    .run({
      id: l.id,
      slug: l.slug,
      title: l.title,
      category: l.category,
      boat_class: l.boatClass,
      discipline: l.discipline,
      seats: l.seats,
      coxed: l.coxed == null ? null : l.coxed ? 1 : 0,
      manufacturer: l.manufacturer,
      model: l.model,
      year: l.year,
      condition: l.condition,
      condition_grade: l.conditionGrade,
      material: l.material,
      rigging: l.rigging,
      crew_weight_min: l.crewWeightMinKg,
      crew_weight_max: l.crewWeightMaxKg,
      hull_weight_kg: l.hullWeightKg,
      length_cm: l.lengthCm,
      sizes: JSON.stringify(l.sizes ?? []),
      fit: l.fit,
      quantity: l.quantity,
      price: l.price,
      currency: l.currency,
      price_basis: l.priceBasis,
      price_usd: l.priceUsd,
      location: JSON.stringify(l.location),
      continent: l.location.continent,
      country: l.location.country,
      seller: JSON.stringify(l.seller),
      seller_type: l.seller.type,
      seller_verified: l.seller.verified ? 1 : 0,
      status: l.status,
      listed_at: l.listedAt,
      updated_at: l.updatedAt,
      highlights: JSON.stringify(l.highlights),
      description: l.description,
      photos: JSON.stringify(l.photos ?? []),
      photo_direction: l.photoDirection,
      art_seed: l.artSeed,
      source: l.source,
      source_url: l.sourceUrl ?? null,
      source_name: l.sourceName ?? null,
    });

  database
    .prepare(
      `INSERT INTO listings_fts (id, title, manufacturer, model, description, highlights)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(l.id, l.title, l.manufacturer, l.model, l.description, l.highlights.join(" "));
}

/** Shape of a `listings` row as better-sqlite3 hands it back. */
export interface ListingRow {
  id: string; slug: string; title: string; category: string;
  boat_class: string | null; discipline: string | null; seats: number | null;
  coxed: number | null; manufacturer: string; model: string; year: number;
  condition: string; condition_grade: string; material: string; rigging: string | null;
  crew_weight_min: number | null; crew_weight_max: number | null;
  hull_weight_kg: number | null; length_cm: number | null;
  sizes: string; fit: string | null; quantity: number | null;
  price: number; currency: string; price_basis: string; price_usd: number;
  location: string; continent: string; country: string;
  seller: string; seller_type: string; seller_verified: number;
  status: string; listed_at: string; updated_at: string;
  highlights: string; description: string; photos: string; photo_direction: string;
  art_seed: number; source: string; source_url: string | null; source_name: string | null;
}

export function rowToListing(r: ListingRow): Listing {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category as Listing["category"],
    boatClass: r.boat_class as Listing["boatClass"],
    discipline: r.discipline as Listing["discipline"],
    seats: r.seats,
    coxed: r.coxed == null ? null : r.coxed === 1,
    manufacturer: r.manufacturer,
    model: r.model,
    year: r.year,
    condition: r.condition as Listing["condition"],
    conditionGrade: r.condition_grade as Listing["conditionGrade"],
    material: r.material as Listing["material"],
    rigging: r.rigging as Listing["rigging"],
    crewWeightMinKg: r.crew_weight_min,
    crewWeightMaxKg: r.crew_weight_max,
    hullWeightKg: r.hull_weight_kg,
    lengthCm: r.length_cm,
    sizes: JSON.parse(r.sizes || "[]") as Listing["sizes"],
    fit: r.fit as Listing["fit"],
    quantity: r.quantity,
    price: r.price,
    currency: r.currency as Listing["currency"],
    priceBasis: r.price_basis as Listing["priceBasis"],
    priceUsd: r.price_usd,
    location: JSON.parse(r.location) as Listing["location"],
    seller: JSON.parse(r.seller) as Listing["seller"],
    status: r.status as Listing["status"],
    listedAt: r.listed_at,
    updatedAt: r.updated_at,
    highlights: JSON.parse(r.highlights) as string[],
    description: r.description,
    photos: JSON.parse(r.photos || "[]") as Listing["photos"],
    photoDirection: r.photo_direction,
    artSeed: r.art_seed,
    source: r.source as Listing["source"],
    sourceUrl: r.source_url,
    sourceName: r.source_name,
  };
}
