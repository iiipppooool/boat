#!/usr/bin/env node
/**
 * Reports photograph coverage across the inventory: which listings have
 * photographs, which are still showing the generated illustration, which files
 * are relying on filename-derived alt text, and whether any folder name matches
 * no listing (a slug typo is otherwise invisible, you just never see your
 * photos).
 *
 *   npm run photos
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public", "listings");
const seed = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "seed-listings.json"), "utf8"));
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const slugs = new Set(seed.map((l) => l.slug));
const folders = fs.existsSync(root)
  ? fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : [];

const withPhotos = [];
const orphans = [];
let derivedAlt = 0;

for (const folder of folders) {
  const dir = path.join(root, folder);
  const files = fs.readdirSync(dir).filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
  if (!files.length) continue;

  if (!slugs.has(folder)) {
    orphans.push(folder);
    continue;
  }

  let captions = {};
  const captionFile = path.join(dir, "captions.json");
  if (fs.existsSync(captionFile)) {
    try {
      captions = JSON.parse(fs.readFileSync(captionFile, "utf8"));
    } catch {
      console.warn(`  ! ${folder}/captions.json is not valid JSON`);
    }
  }
  const missing = files.filter((f) => !captions[f]?.alt);
  derivedAlt += missing.length;
  withPhotos.push({ folder, count: files.length, missing });
}

const total = seed.length;
console.log(`\nPhotograph coverage: ${withPhotos.length} of ${total} listings\n`);

if (withPhotos.length) {
  for (const { folder, count, missing } of withPhotos) {
    const note = missing.length ? `  (${missing.length} using derived alt text)` : "";
    console.log(`  ${String(count).padStart(2)} photo(s)  ${folder}${note}`);
  }
  console.log("");
}

if (derivedAlt) {
  console.log(`${derivedAlt} image(s) have no written alt text. Add captions.json, see public/listings/README.md.\n`);
}

if (orphans.length) {
  console.log(`These folders match no listing slug, so nothing will show:\n`);
  for (const o of orphans) console.log(`  ${o}`);
  console.log("");
}

const without = seed.filter((l) => !withPhotos.some((w) => w.folder === l.slug));
if (without.length) {
  console.log(`Still showing the generated illustration (${without.length}):\n`);
  for (const l of without.slice(0, 10)) console.log(`  ${l.slug}`);
  if (without.length > 10) console.log(`  … and ${without.length - 10} more`);
  console.log("");
}
