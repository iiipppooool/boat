#!/usr/bin/env node
/**
 * Pulls listings from every configured aggregation source into the market.
 *
 *   npm run dev                       # in one terminal
 *   npm run sync-sources              # in another
 *   npm run sync-sources -- --status  # what happened last time, no writes
 *
 * The work happens in the running app (src/lib/sources/sync.ts) rather than in
 * this file, so there is one code path whether a sync is triggered by a person,
 * by cron or by a deploy hook. This script is a convenience wrapper around
 * POST /api/sources/sync.
 *
 * Nothing is configured by default. Aggregating another marketplace's listings
 * needs a licensed feed or the seller's permission. See
 * src/lib/sources/README.md for what qualifies and what does not.
 */
const base = process.env.SITE_URL || "http://localhost:3000";
const token = process.env.SYNC_TOKEN;
const statusOnly = process.argv.includes("--status");

const status = await fetch(`${base}/api/sources/sync`).catch(() => null);
if (!status || !status.ok) {
  console.error(`Could not reach ${base}. Is the app running?`);
  process.exit(1);
}

const state = await status.json();

if (!state.configured.length) {
  console.log(`
No aggregation sources are configured.

Two routes are supported out of the box:

  eBay, via the official Browse API. Register at developer.ebay.com, then set
    EBAY_CLIENT_ID and EBAY_CLIENT_SECRET (and EBAY_MARKETPLACE, default
    EBAY_GB). Their terms permit displaying results that link back, which is
    exactly how these listings are rendered.

  A dealer's or club's own feed. Ask them for a JSON URL, then set
    DEALER_FEEDS="Their Name|https://their.site/feed.json"
    Several are comma separated. The expected shape is validated in
    src/lib/sources/feed.ts.

For listings you already have permission to carry as your own, use instead:
  npm run import -- your-listings.csv
`);
  process.exit(0);
}

console.log(`Configured: ${state.configured.join(", ")}\n`);

if (statusOnly) {
  if (!state.status.length) {
    console.log("No sync has run yet.");
  }
  for (const row of state.status) {
    console.log(
      `  ${row.source.padEnd(24)} last run ${row.lastRunAt.slice(0, 16).replace("T", " ")}` +
        `  +${row.added} added  ${row.updated} updated  ${row.withdrawn} withdrawn` +
        (row.note ? `\n    ${row.note}` : ""),
    );
  }
  process.exit(0);
}

if (!token) {
  console.error(
    "Set SYNC_TOKEN to the same value the app has, so the sync endpoint will\n" +
      "accept the request:\n\n  SYNC_TOKEN=... npm run sync-sources\n",
  );
  process.exit(1);
}

console.log("Syncing…\n");
const response = await fetch(`${base}/api/sources/sync`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
});
const body = await response.json();

if (!response.ok || !body.ok) {
  console.error(`Sync failed: ${body.error ?? response.status}`);
  process.exit(1);
}

for (const row of body.sources) {
  if (row.skipped) {
    console.log(`  ${row.source.padEnd(24)} returned nothing; its listings were left alone.`);
    continue;
  }
  console.log(
    `  ${row.source.padEnd(24)} +${row.added} added  ${row.updated} updated  ${row.withdrawn} withdrawn`,
  );
}
console.log();
