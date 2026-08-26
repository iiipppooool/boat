#!/usr/bin/env node
/**
 * Pulls listings from every registered aggregation source into the market.
 *
 *   npm run dev              # in one terminal
 *   npm run sync-sources     # in another
 *
 * Nothing is registered by default — aggregating another site's inventory needs
 * their permission or a licensed feed. See src/lib/sources/README.md for what
 * counts and what does not.
 */
import fs from "node:fs";
import path from "node:path";

const registry = path.join(process.cwd(), "src", "lib", "sources", "registry.ts");
const source = fs.existsSync(registry) ? fs.readFileSync(registry, "utf8") : "";
const registered = /SOURCES:\s*SourceAdapter\[\]\s*=\s*\[\s*\]/.test(source) ? 0 : 1;

if (!registered) {
  console.log(`
No aggregation sources are registered.

Aggregating another marketplace's listings needs a licensed feed or the
seller's permission. Three routes that qualify:

  1. An official API with a partner programme — eBay's Partner Network is the
     obvious one for used boats and kit. Register, get a key, write an adapter.
  2. A dealer's own feed. Ask them; Boathouse-tier dealers want the exposure.
  3. A club that wants its noticeboard mirrored.

Write an adapter in src/lib/sources/, add it to registry.ts, and run this again.
Full guidance, including what does NOT qualify: src/lib/sources/README.md

For listings you already have permission to carry, use:
  npm run import -- your-listings.csv
`);
  process.exit(0);
}

console.log("Sources are registered but the sync runner is not implemented yet.");
console.log("Implement it against SourceAdapter.fetchListings() in src/lib/sources/types.ts.");
