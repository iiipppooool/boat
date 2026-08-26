import Image from "next/image";
import { HullArt } from "./HullArt";
import type { Category, ListingPhoto } from "@/lib/types";

/**
 * One image slot for a listing: the real photograph when there is one, the
 * generated illustration when there is not.
 *
 * Every surface that shows a listing goes through here, so adding photographs
 * to a listing changes the whole site at once and no page needs to know whether
 * a given boat has been photographed yet.
 */
export function ListingImage({
  photos, index = 0, seed, category, label, sizes, priority, ratio,
}: {
  photos: ListingPhoto[];
  /** Which photo to show. Falls back to the illustration if out of range. */
  index?: number;
  seed: number;
  category?: Category;
  /** Used for the illustration's accessible name; photos carry their own alt. */
  label: string;
  /** Responsive hint for the image optimiser — the CSS width at each breakpoint. */
  sizes?: string;
  priority?: boolean;
  ratio?: number;
}) {
  const photo = photos[index];

  if (!photo) {
    return <HullArt seed={seed} category={category} label={label} ratio={ratio} />;
  }

  return (
    <Image
      src={photo.src}
      alt={photo.alt || label}
      fill
      // Without this the optimiser assumes full viewport width and ships a
      // 3840px file to fill a 280px card.
      sizes={sizes ?? "(max-width: 40rem) 100vw, 22rem"}
      priority={priority}
      className="listing-photo"
    />
  );
}

/** True when a listing has photographs, so callers can label them honestly. */
export function hasPhotos(photos: ListingPhoto[]): boolean {
  return photos.length > 0;
}
