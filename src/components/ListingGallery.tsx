"use client";

import Image from "next/image";
import { useState } from "react";
import { HullArt } from "./HullArt";
import type { Category, ListingPhoto } from "@/lib/types";

const ILLUSTRATION_VIEWS = [
  { scene: "waterline", label: "Hull profile" },
  { scene: "boathouse", label: "On the water" },
  { scene: "rigger", label: "Rigging detail" },
  { scene: "puddles", label: "Under way" },
] as const;

/**
 * The listing gallery, in two modes.
 *
 * With photographs it is an ordinary gallery: one large image, a thumbnail
 * strip, and photographer credit where given. Without them it shows the
 * generated illustration and says so — a buyer spending five figures deserves
 * to know which pictures are real, and the seller's photo brief for this
 * specific item is printed beneath so it is obvious what is still missing.
 */
export function ListingGallery({
  photos, seed, category, title, direction,
}: {
  photos: ListingPhoto[];
  seed: number;
  category: Category;
  title: string;
  direction: string;
}) {
  const [index, setIndex] = useState(0);

  return photos.length > 0 ? (
    <PhotoGallery photos={photos} title={title} index={index} onSelect={setIndex} />
  ) : (
    <IllustrationGallery
      seed={seed}
      category={category}
      title={title}
      direction={direction}
      index={index}
      onSelect={setIndex}
    />
  );
}

function PhotoGallery({
  photos, title, index, onSelect,
}: {
  photos: ListingPhoto[];
  title: string;
  index: number;
  onSelect: (n: number) => void;
}) {
  const active = photos[Math.min(index, photos.length - 1)];
  const credits = [...new Set(photos.map((p) => p.credit).filter(Boolean))];

  return (
    <figure className="gallery">
      <div className="gallery-main gallery-main-photo">
        <Image
          src={active.src}
          alt={active.alt || title}
          fill
          sizes="(max-width: 62rem) 100vw, 46rem"
          priority
          className="listing-photo"
        />
      </div>

      {photos.length > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label={`Photographs of ${title}`}>
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={photo.alt || `Photograph ${i + 1} of ${title}`}
              className={`gallery-thumb gallery-thumb-photo${i === index ? " is-active" : ""}`}
              onClick={() => onSelect(i)}
            >
              <Image src={photo.src} alt="" fill sizes="8rem" className="listing-photo" />
            </button>
          ))}
        </div>
      )}

      {credits.length > 0 && (
        <figcaption className="gallery-caption small">
          Photographs: {credits.join(" · ")}
        </figcaption>
      )}
    </figure>
  );
}

function IllustrationGallery({
  seed, category, title, direction, index, onSelect,
}: {
  seed: number;
  category: Category;
  title: string;
  direction: string;
  index: number;
  onSelect: (n: number) => void;
}) {
  // Equipment has one composition of its own, so there is nothing to tab
  // between — showing four identical thumbnails would be worse than none.
  const isBoat = category === "shell";
  const views = isBoat ? ILLUSTRATION_VIEWS : [];
  const active = views[index] ?? null;

  return (
    <figure className="gallery">
      <div className="gallery-main">
        <HullArt
          seed={seed + index * 17}
          category={active ? undefined : category}
          scene={active?.scene}
          ratio={0.62}
          label={`${active ? `${active.label} — i` : "I"}llustration standing in for photography of ${title}`}
        />
      </div>

      {views.length > 0 && (
        <div className="gallery-thumbs" role="tablist" aria-label="Views">
          {views.map((view, i) => (
            <button
              key={view.scene}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`gallery-thumb${i === index ? " is-active" : ""}`}
              onClick={() => onSelect(i)}
            >
              <HullArt seed={seed + i * 17} scene={view.scene} ratio={0.66} />
              <span>{view.label}</span>
            </button>
          ))}
        </div>
      )}

      <figcaption className="gallery-caption small">
        <strong>Illustration, not photography.</strong> This listing has no
        photographs yet. Seller&rsquo;s photo brief: {direction}
      </figcaption>
    </figure>
  );
}
