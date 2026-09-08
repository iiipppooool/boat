import type { SeedListing } from "@/lib/types";

/**
 * A listing pulled from another marketplace under a licensed feed.
 *
 * `sourceUrl` and `sourceName` are required rather than optional: an aggregated
 * listing that cannot send the buyer to the source is not a listing, it is a
 * dead end. See ./README.md for why the distinction matters.
 */
export type AggregatedListing = Omit<
  SeedListing,
  "id" | "slug" | "artSeed" | "source" | "sourceUrl" | "sourceName"
> & {
  /** Stable id from the source, so re-syncing updates rather than duplicates. */
  externalId: string;
  sourceUrl: string;
  sourceName: string;
};

export interface SourceAdapter {
  /** Shown to buyers as "Listed on <name>". */
  name: string;
  /**
   * Pulls current listings. Must resolve, never throw. A source that is down
   * should return an empty array and log; one broken feed must not be able to
   * empty the market.
   */
  fetchListings(): Promise<AggregatedListing[]>;
}
