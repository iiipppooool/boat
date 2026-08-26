import type { SourceAdapter } from "./types";

/**
 * Every aggregation source, in one list. Empty by default — aggregating
 * someone else's inventory needs their permission or a licensed feed, so there
 * is nothing here until you have one. See ./README.md.
 */
export const SOURCES: SourceAdapter[] = [];
