import "server-only";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import type { ListingPhoto } from "./types";

/**
 * Photographs, from the filesystem.
 *
 * The whole point of this module is that adding real photos to a listing should
 * require no code and no database work. Drop image files into
 *
 *     public/listings/<listing-slug>/
 *
 * and on the next start they become that listing's gallery, in filename order.
 * Anything without a folder keeps the generated illustration.
 *
 * Alt text comes from an optional `captions.json` in the same folder. Where it
 * is missing, a readable fallback is derived from the filename, good enough
 * that no image ships without alt text, and `npm run photos` reports which
 * listings are relying on the fallback so they can be written properly.
 */

const PHOTO_ROOT = ["public", "listings"];
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export interface PhotoCaption {
  alt?: string;
  credit?: string;
  /**
   * True when the image is a stock photograph of something similar rather than
   * of this item. Surfaced in the gallery: a stand-in presented as the thing
   * for sale misleads a buyer, and that is not a trade worth making.
   */
  stock?: boolean;
}

export interface ScannedListing {
  slug: string;
  photos: ListingPhoto[];
  /** Files that fell back to a derived alt rather than a written one. */
  missingAlt: string[];
}

function photoRoot(): string {
  return path.join(process.cwd(), ...PHOTO_ROOT);
}

/** "02-bow-quarter.jpg" -> "Bow quarter". Numeric prefixes are ordering, not content. */
export function altFromFilename(file: string): string {
  const base = path
    .basename(file, path.extname(file))
    .replace(/^[\s_\-.\d]+/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Sorts 2 before 10, which plain string sorting does not. */
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

export function scanPhotoFolders(): ScannedListing[] {
  const root = photoRoot();
  if (!fs.existsSync(root)) return [];

  const out: ScannedListing[] = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const dir = path.join(root, entry.name);
    const files = fs
      .readdirSync(dir)
      .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .sort(naturalCompare);
    if (!files.length) continue;

    let captions: Record<string, PhotoCaption> = {};
    const captionFile = path.join(dir, "captions.json");
    if (fs.existsSync(captionFile)) {
      try {
        captions = JSON.parse(fs.readFileSync(captionFile, "utf8")) as Record<string, PhotoCaption>;
      } catch {
        // A malformed captions file must not take the site down; the derived
        // alt text below is a working fallback, and `npm run photos` flags it.
        console.warn(`[photos] ${entry.name}/captions.json is not valid JSON, ignoring it`);
      }
    }

    const missingAlt: string[] = [];
    const photos: ListingPhoto[] = files.map((file) => {
      const caption = captions[file] ?? {};
      const derived = altFromFilename(file);
      if (!caption.alt) missingAlt.push(file);
      return {
        src: `/listings/${entry.name}/${file}`,
        alt: caption.alt ?? derived,
        ...(caption.credit ? { credit: caption.credit } : {}),
        ...(caption.stock ? { stock: true } : {}),
      };
    });

    out.push({ slug: entry.name, photos, missingAlt });
  }

  return out;
}

/**
 * Writes what is on disk into the database, for listings that have a folder.
 * Runs on boot, after seeding. A listing whose photos have not changed is not
 * rewritten, so this stays cheap on every start.
 *
 * Photos are keyed by folder name = listing slug. A folder that matches no
 * listing is reported rather than silently ignored, because a typo in a slug is
 * otherwise invisible, you just never see your photos.
 */
export function syncPhotos(database: Database.Database): { updated: number; orphans: string[] } {
  const scanned = scanPhotoFolders();
  if (!scanned.length) return { updated: 0, orphans: [] };

  const read = database.prepare("SELECT photos FROM listings WHERE slug = ?");
  const write = database.prepare("UPDATE listings SET photos = ? WHERE slug = ?");

  let updated = 0;
  const orphans: string[] = [];

  const apply = database.transaction((items: ScannedListing[]) => {
    for (const item of items) {
      const row = read.get(item.slug) as { photos: string } | undefined;
      if (!row) {
        orphans.push(item.slug);
        continue;
      }
      const next = JSON.stringify(item.photos);
      if (row.photos !== next) {
        write.run(next, item.slug);
        updated += 1;
      }
    }
  });
  apply(scanned);

  if (orphans.length) {
    console.warn(
      `[photos] ${orphans.length} folder(s) match no listing slug: ${orphans.join(", ")}`,
    );
  }

  return { updated, orphans };
}
