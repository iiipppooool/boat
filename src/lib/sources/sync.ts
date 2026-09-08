import "server-only";
import { getDb, insertListingRow, withPriceUsd } from "@/lib/db";
import { toUsd } from "@/lib/fx";
import type { Listing } from "@/lib/types";
import { getSources } from "./registry";
import type { AggregatedListing } from "./types";

/**
 * Pulling aggregated listings into the market, repeatedly, without duplicating
 * or stranding anything.
 *
 * The hard part of a feed is not the first import, it is the hundredth. Three
 * rules keep it honest:
 *
 *   1. `externalId` is the identity. A listing that comes back with the same
 *      external id updates in place, so a price change is a price change and
 *      not a second copy of the boat.
 *   2. A listing that stops appearing in its feed is marked `withdrawn`, not
 *      deleted. It has almost certainly sold, and a market that quietly
 *      disappears boats teaches buyers that it is not worth watching.
 *   3. A source returning nothing is treated as a source that is down, not as a
 *      source that has sold out. Withdrawing an entire dealer's stock because
 *      their server had a bad minute is the failure mode worth engineering
 *      against.
 */

export interface SyncResult {
  source: string;
  added: number;
  updated: number;
  withdrawn: number;
  /** True when the source returned nothing and was therefore left alone. */
  skipped: boolean;
}

export const SOURCE_STATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS source_syncs (
  source      TEXT PRIMARY KEY,
  last_run_at TEXT NOT NULL,
  last_ok_at  TEXT,
  added       INTEGER NOT NULL DEFAULT 0,
  updated     INTEGER NOT NULL DEFAULT 0,
  withdrawn   INTEGER NOT NULL DEFAULT 0,
  note        TEXT NOT NULL DEFAULT ''
);
`;

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hashToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}

/** Deterministic from the external id, so re-syncing lands on the same row. */
function idFor(listing: AggregatedListing): string {
  return `agg-${slugify(listing.sourceName)}-${slugify(listing.externalId)}`.slice(0, 90);
}

function toListing(input: AggregatedListing, id: string, slug: string): Listing {
  const { externalId, ...rest } = input;
  void externalId;
  return withPriceUsd({
    ...rest,
    id,
    slug,
    artSeed: hashToSeed(id),
    source: "aggregated",
    sourceUrl: input.sourceUrl,
    sourceName: input.sourceName,
  });
}

function uniqueSlug(base: string, keepId: string): string {
  const db = getDb();
  const root = slugify(base) || "listing";
  const clash = db.prepare("SELECT id FROM listings WHERE slug = ?");
  let candidate = root;
  let n = 2;
  for (;;) {
    const row = clash.get(candidate) as { id: string } | undefined;
    if (!row || row.id === keepId) return candidate;
    candidate = `${root}-${n++}`;
  }
}

/** Runs one adapter and reconciles its listings against what is already stored. */
async function syncOne(
  adapter: ReturnType<typeof getSources>[number],
): Promise<SyncResult> {
  const db = getDb();
  const now = new Date().toISOString();
  const result: SyncResult = {
    source: adapter.name,
    added: 0,
    updated: 0,
    withdrawn: 0,
    skipped: false,
  };

  const incoming = await adapter.fetchListings();

  // Rule 3: nothing back means the source is down. Leave its listings alone.
  if (!incoming.length) {
    result.skipped = true;
    db.prepare(
      `INSERT INTO source_syncs (source, last_run_at, note)
       VALUES (?, ?, 'returned nothing; existing listings left in place')
       ON CONFLICT(source) DO UPDATE SET last_run_at = excluded.last_run_at, note = excluded.note`,
    ).run(adapter.name, now);
    return result;
  }

  const existing = db
    .prepare("SELECT id, slug FROM listings WHERE source = 'aggregated' AND source_name = ?")
    .all(adapter.name) as { id: string; slug: string }[];
  const known = new Map(existing.map((row) => [row.id, row.slug]));
  const seen = new Set<string>();

  const apply = db.transaction((items: AggregatedListing[]) => {
    for (const item of items) {
      const id = idFor(item);
      seen.add(id);

      if (known.has(id)) {
        // Rule 1: same boat, new numbers. Update the fields that move and leave
        // the slug alone so any link already shared keeps working.
        db.prepare(
          `UPDATE listings SET
             title = ?, price = ?, currency = ?, price_usd = ?, status = ?,
             updated_at = ?, description = ?, photos = ?, source_url = ?
           WHERE id = ?`,
        ).run(
          item.title,
          item.price,
          item.currency,
          toUsd(item.price, item.currency),
          item.status,
          item.updatedAt,
          item.description,
          JSON.stringify(item.photos ?? []),
          item.sourceUrl,
          id,
        );
        result.updated += 1;
      } else {
        const slug = uniqueSlug(`${item.year}-${item.manufacturer}-${item.model}`, id);
        insertListingRow(db, toListing(item, id, slug));
        result.added += 1;
      }
    }

    // Rule 2: gone from the feed means sold, not deleted.
    for (const id of known.keys()) {
      if (seen.has(id)) continue;
      const changed = db
        .prepare("UPDATE listings SET status = 'withdrawn', updated_at = ? WHERE id = ? AND status <> 'withdrawn'")
        .run(new Date().toISOString().slice(0, 10), id);
      result.withdrawn += changed.changes;
    }
  });

  apply(incoming);

  db.prepare(
    `INSERT INTO source_syncs (source, last_run_at, last_ok_at, added, updated, withdrawn, note)
     VALUES (?, ?, ?, ?, ?, ?, '')
     ON CONFLICT(source) DO UPDATE SET
       last_run_at = excluded.last_run_at, last_ok_at = excluded.last_ok_at,
       added = excluded.added, updated = excluded.updated,
       withdrawn = excluded.withdrawn, note = ''`,
  ).run(adapter.name, now, now, result.added, result.updated, result.withdrawn);

  return result;
}

/** Runs every configured source. One failing source never stops the others. */
export async function syncAllSources(): Promise<SyncResult[]> {
  const sources = getSources();
  const results: SyncResult[] = [];

  for (const adapter of sources) {
    try {
      results.push(await syncOne(adapter));
    } catch (error) {
      console.error(`[sources] ${adapter.name} threw:`, error);
      results.push({
        source: adapter.name,
        added: 0,
        updated: 0,
        withdrawn: 0,
        skipped: true,
      });
    }
  }

  return results;
}

export interface SourceStatus {
  source: string;
  lastRunAt: string;
  lastOkAt: string | null;
  added: number;
  updated: number;
  withdrawn: number;
  note: string;
}

export function getSourceStatus(): SourceStatus[] {
  return (
    getDb()
      .prepare("SELECT * FROM source_syncs ORDER BY source")
      .all() as {
      source: string; last_run_at: string; last_ok_at: string | null;
      added: number; updated: number; withdrawn: number; note: string;
    }[]
  ).map((row) => ({
    source: row.source,
    lastRunAt: row.last_run_at,
    lastOkAt: row.last_ok_at,
    added: row.added,
    updated: row.updated,
    withdrawn: row.withdrawn,
    note: row.note,
  }));
}

/** The most recent successful sync across all sources, for the "live" badge. */
export function lastSyncAt(): string | null {
  const row = getDb()
    .prepare("SELECT MAX(last_ok_at) AS at FROM source_syncs")
    .get() as { at: string | null };
  return row?.at ?? null;
}

/** How many listings in the market came from a feed rather than from a seller. */
export function aggregatedCount(): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS n FROM listings WHERE source = 'aggregated' AND status = 'available'")
      .get() as { n: number }
  ).n;
}
