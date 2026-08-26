"use client";

import { useState } from "react";
import { HullArt } from "./HullArt";

const VIEWS = [
  { scene: "waterline", label: "Hull profile" },
  { scene: "boathouse", label: "On the water" },
  { scene: "rigger", label: "Rigging detail" },
  { scene: "puddles", label: "Under way" },
] as const;

/**
 * Stands in for the photo gallery a real listing will have. It is labelled as
 * illustration rather than dressed up as photography — a buyer spending five
 * figures deserves to know which pictures are real, and the seller's photo
 * brief for this boat is printed beneath it.
 */
export function ListingGallery({
  seed, title, direction,
}: {
  seed: number;
  title: string;
  direction: string;
}) {
  const [index, setIndex] = useState(0);
  const active = VIEWS[index];

  return (
    <figure className="gallery">
      <div className="gallery-main">
        <HullArt
          seed={seed + index * 17}
          scene={active.scene}
          ratio={0.62}
          label={`${active.label} — illustration standing in for photography of ${title}`}
        />
      </div>

      <div className="gallery-thumbs" role="tablist" aria-label="Views">
        {VIEWS.map((view, i) => (
          <button
            key={view.scene}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`gallery-thumb${i === index ? " is-active" : ""}`}
            onClick={() => setIndex(i)}
          >
            <HullArt seed={seed + i * 17} scene={view.scene} ratio={0.66} />
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      <figcaption className="gallery-caption small">
        <strong>Illustration, not photography.</strong> Seller&rsquo;s photo brief for
        this listing: {direction}
      </figcaption>
    </figure>
  );
}
