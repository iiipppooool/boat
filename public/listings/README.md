# Listing photographs

Drop photographs in here and they appear on the site. No code, no database work,
no admin screen.

## How

One folder per listing, named exactly as the listing's **slug** — the last part
of its URL:

```
https://boatxchange.com/market/2021-filippi-f1-single-scull-lucerne
                               └──────────── the slug ────────────┘
```

```
public/listings/
└── 2021-filippi-f1-single-scull-lucerne/
    ├── 01-bow-quarter.jpg
    ├── 02-hull-profile.jpg
    ├── 03-rigger-detail.jpg
    ├── 04-stern-repair.jpg
    └── captions.json          ← optional but do write it
```

Restart the app. The photographs become that listing's gallery, in filename
order — which is why the numeric prefixes are there. Listings with no folder
keep the generated illustration.

Run `npm run photos` at any time to see which listings have photographs, which
do not, and whether any folder name matches no listing.

## Alt text

`captions.json` is how you write proper alt text and credit:

```json
{
  "01-bow-quarter.jpg": {
    "alt": "The single seen from the bow quarter on flat water at dawn, the wing rigger catching the light",
    "credit": "Seeclub Reuss"
  },
  "04-stern-repair.jpg": {
    "alt": "Close-up of the repaired stern section, the patch visible under the paint"
  }
}
```

Without it, alt text is derived from the filename — `02-hull-profile.jpg`
becomes "Hull profile". That is enough that no image ever ships without alt
text, but it is not a description, and `npm run photos` will tell you which
files are relying on it.

## Formats and sizes

`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`. Upload the full-size original;
Next.js resizes and re-encodes per breakpoint, so a 4000px photo is not what
gets sent to a phone. Landscape, roughly 3:2, crops best — cards and the gallery
both crop to fill rather than letterbox.

## What to shoot

Every seed listing carries a `photoDirection` field with a brief written for
that specific item, and it is printed under the illustration on the listing page
while photographs are missing. The general rule, in order of what sells a boat:

1. **Three-quarter bow view** on the water. The hero shot.
2. **Full hull profile**, side on, whole boat in frame, straight background.
3. **The detail that proves the claim** — the rigger, the tracks, the build plate.
4. **Every repair and every mark, honestly.** Buyers who cannot see the damage
   assume it is worse than it is. This is the shot that shortens a sale.

For kit: a flat-lay of the whole size run, one shot on a person for the cut, and
an honest close-up of wear on the seat panel. For gear: the unit powered on with
the screen readable, everything included laid out together, and any damage to
the casing or cable.

## Remote images instead

If photographs live on a CDN rather than in the repo, put the absolute URL in a
listing's `photos[].src` and add the hostname to `images.remotePatterns` in
`next.config.mjs`. Everything else works the same.
