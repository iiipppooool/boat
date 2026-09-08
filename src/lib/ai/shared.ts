import type { Listing } from "@/lib/types";

/**
 * Shapes shared by the concierge API route and the chat UI. Kept free of any
 * server-only import so the client component can use them directly.
 */

/** Trimmed listing sent to the browser, enough for a card and a comparison row. */
export interface ConciergeListingRef {
  id: string;
  slug: string;
  title: string;
  manufacturer: string;
  category: Listing["category"];
  boatClassLabel: string;
  condition: "new" | "used";
  conditionLabel: string;
  materialLabel: string;
  weightBand: string | null;
  hullWeightKg: number | null;
  sizeRange: string | null;
  fitLabel: string | null;
  lotSize: string | null;
  priceLabel: string;
  priceNote: string | null;
  location: string;
  sellerLabel: string;
  verified: boolean;
  status: Listing["status"];
  artSeed: number;
}

export type ConciergeEvent =
  | { type: "context"; listings: ConciergeListingRef[]; provider: string; model: string; live: boolean }
  | { type: "delta"; text: string }
  | { type: "done"; referenced: string[] }
  | { type: "error"; message: string };

export interface ConciergeChatMessage {
  role: "user" | "assistant";
  content: string;
}
