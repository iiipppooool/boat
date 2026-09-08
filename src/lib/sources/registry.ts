import type { SourceAdapter } from "./types";
import { ebayAdapter } from "./ebay";
import { feedAdapters } from "./feed";

/**
 * Every aggregation source, assembled from what is configured.
 *
 * Adapters register themselves only when their credentials are present, so an
 * install with no keys has an empty registry and a market made purely of its
 * own listings. That is the correct default: aggregating somebody else's
 * inventory needs their permission or a licensed feed, and neither of those
 * arrives by accident. See ./README.md.
 */
export function getSources(): SourceAdapter[] {
  const sources: SourceAdapter[] = [];

  const ebay = ebayAdapter();
  if (ebay) sources.push(ebay);

  sources.push(...feedAdapters());

  return sources;
}

/** Kept for anything still importing the old constant. */
export const SOURCES: SourceAdapter[] = [];
