#!/usr/bin/env node
/**
 * Fetches real rowing photographs from Unsplash into public/listings/<slug>/.
 *
 *   export UNSPLASH_ACCESS_KEY=...            # free, from unsplash.com/developers
 *   npm run photos:fetch -- --slug 2021-filippi-f1-single-scull-lucerne --query "single scull rowing"
 *   npm run photos:fetch -- --all             # one photo for every listing lacking any
 *
 * Why this is a script you run rather than something the build does: the
 * environment this repo was written in cannot reach any image host. Yours can.
 *
 * It writes captions.json alongside the images with the photographer's name and
 * profile link, because Unsplash's API terms require attribution, and it marks
 * them `stock: true` so the gallery can say what they are.
 *
 * IMPORTANT: a stock photograph of a *different* boat, presented as the item for
 * sale, misleads buyers. These are for filling out a demo or a staging site. For
 * a real listing, use the seller's own photographs.
 */
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!KEY) {
  console.error(
    "Set UNSPLASH_ACCESS_KEY first. A free account at\n" +
    "https://unsplash.com/developers gives you one in about two minutes.\n",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const all = args.includes("--all");
const perListing = Number(flag("count") ?? 1);

const listings = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "seed-listings.json"), "utf8"),
);
const root = path.join(process.cwd(), "public", "listings");

/** A search phrase that stands a chance of returning the right kind of picture. */
function queryFor(listing) {
  switch (listing.category) {
    case "apparel": return "rowing team kit athletes";
    case "gear": return "rowing boathouse equipment";
    case "oars": return "rowing oars blades";
    case "trailer": return "boat trailer regatta";
    default:
      if (listing.discipline === "coastal") return "coastal rowing boat sea";
      if (listing.boatClass === "8+") return "rowing eight crew race";
      if (listing.boatClass === "1x") return "single scull rowing";
      return "rowing boat river crew";
  }
}

async function search(query) {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${KEY}`, "Accept-Version": "v1" },
  });
  if (!response.ok) {
    throw new Error(`Unsplash returned ${response.status}: ${await response.text()}`);
  }
  const body = await response.json();
  return Array.isArray(body?.results) ? body.results : [];
}

async function download(photo, dir, index) {
  const src = photo?.urls?.regular ?? photo?.urls?.full;
  if (!src) return null;

  const image = await fetch(src);
  if (!image.ok) return null;

  const name = `${String(index + 1).padStart(2, "0")}-${photo.id}.jpg`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(await image.arrayBuffer()));

  // Unsplash asks that clients ping the download endpoint when an image is
  // actually used. Best effort, a failure here must not lose the file.
  if (photo?.links?.download_location) {
    try {
      await fetch(photo.links.download_location, {
        headers: { Authorization: `Client-ID ${KEY}` },
      });
    } catch {}
  }

  const who = photo?.user?.name ?? "Unsplash";
  const link = photo?.user?.links?.html;
  return [
    name,
    {
      alt: photo?.alt_description
        ? `Stock photograph: ${photo.alt_description}`
        : "Stock photograph of rowing, standing in for a photograph of this item",
      credit: link ? `${who} on Unsplash (${link})` : `${who} on Unsplash`,
      stock: true,
    },
  ];
}

const targets = all
  ? listings.filter((l) => !fs.existsSync(path.join(root, l.slug)))
  : listings.filter((l) => l.slug === flag("slug"));

if (!targets.length) {
  console.error(
    all ? "Every listing already has a photo folder." : "No listing matched --slug.",
  );
  process.exit(1);
}

let written = 0;
for (const listing of targets) {
  const query = flag("query") ?? queryFor(listing);
  const dir = path.join(root, listing.slug);
  fs.mkdirSync(dir, { recursive: true });

  try {
    const results = await search(query);
    if (!results.length) {
      console.log(`  none    ${listing.slug}  (no results for "${query}")`);
      continue;
    }
    const captions = {};
    for (let i = 0; i < Math.min(perListing, results.length); i++) {
      const entry = await download(results[i], dir, i);
      if (entry) captions[entry[0]] = entry[1];
    }
    fs.writeFileSync(path.join(dir, "captions.json"), JSON.stringify(captions, null, 2) + "\n");
    written += Object.keys(captions).length;
    console.log(`  ok      ${listing.slug}  ${Object.keys(captions).length} photo(s)  "${query}"`);
  } catch (error) {
    console.log(`  FAIL    ${listing.slug}  ${error.message}`);
  }
}

console.log(
  `\n${written} photograph(s) written. Restart the app to pick them up.\n` +
  "These are stock images of other boats. Replace them with the seller's own\n" +
  "photographs before any real listing goes live.\n",
);
