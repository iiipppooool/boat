# BoatXchange

The global marketplace for rowing boats — new and used. Single sculls, doubles,
quads, fours, eights and coastal hulls, plus the oars, riggers, trailers, racing
kit and gear that go with them, with an AI concierge that reads the live
inventory before it recommends anything.

Rowing is the last boat category without a marketplace of its own. Sailing has
YachtWorld, motor boats have Boats.com; a £40,000 racing eight gets sold through
a club noticeboard and a regional Facebook group. This is the specialist
alternative.

> ### ⚠︎ Everything in this build is invented
>
> **No listing on this site is real.** All 46 are fabricated demo data. The
> manufacturers and model families are real companies and real products — that
> is deliberate, because the filters have to reflect what rowers actually search
> for — but every specific item, price, seller, club, location, email address
> and phone number was made up for this build.
>
> The invented company details are **gone** — there is no longer a company
> registration number, VAT number, postal address, phone number or email address
> anywhere in the site. Contact details now live in `src/lib/site.ts`, blank by
> default, and anything left blank is simply not rendered.
>
> There are also no photographs — every listing currently shows a generated
> illustration, clearly labelled as one. See [Photographs](#photographs).
>
> **[Before you go live](#before-you-go-live)** lists everything that must be
> replaced.

## Seeing it running

There is no hosted instance. To run it on your own machine you need
[Node.js 20 or newer](https://nodejs.org) and nothing else:

```bash
git clone https://github.com/iiipppooool/boat.git
cd boat
git checkout claude/boatxchange-marketplace-build-u41zy2
npm install
npm run dev
```

Then open **http://localhost:3000**.

No database to set up, no API key needed, no services to start. The SQLite file
is created and seeded on the first request. The AI Concierge runs in an offline
mode that returns raw retrieval results and says so on screen; to get real
answers, copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`.

`npm install` takes a minute or two the first time. If `npm run dev` reports
that port 3000 is in use, run `npm run dev -- -p 3001` instead.

| Script | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Delete the SQLite file so the seed reloads |
| `npm run photos` | Report photograph coverage across the inventory |
| `npm run import -- file.csv` | Bulk-create listings from a CSV |

---

## The pages

| Route | |
|---|---|
| `/` | Home — the proposition, trust signals, recent listings, concierge entry point |
| `/market` | The full inventory grid: filters, sort, pagination |
| `/market/[slug]` | Listing detail: gallery, spec sheet, seller, related boats |
| `/concierge` | The AI concierge chat |
| `/sell` | Seller submission form — the real inventory source |
| `/pricing` | Fee model and tiers |
| `/account` | Subscription, payment method, invoices, your listings *(auth stubbed)* |
| `/contact` | Contact form and company details |
| `/about` | Why rowing needed this, how verification works, how the AI is kept honest |
| `/login` | Sign-in *(stubbed)* |
| `404` | Not found |

---

## Architecture

```
data/seed-listings.json ──seeded once──▶ SQLite (var/boatxchange.db)
                                              │
POST /api/sell ───────────writes─────────────▶│
                                              │
                                    src/lib/inventory.ts
                          (the only module that writes SQL)
                                              │
              ┌───────────────┬───────────────┼──────────────────┐
              ▼               ▼               ▼                  ▼
        Home (featured)   /market grid   /market/[slug]   src/lib/ai/concierge.ts
                                                                 │ retrieval
                                                                 ▼
                                                    src/lib/ai/provider.ts
                                                    (the only module that
                                                     calls a language model)
                                                                 │
                                                                 ▼
                                                     POST /api/concierge → chat UI
```

Two chokepoints hold the whole thing together:

- **`src/lib/inventory.ts`** is the single source of truth for listings. Nothing
  else writes SQL. A boat marked sold changes on the home page, in the market
  grid, on its own page and in the concierge's shortlist at the same moment,
  because they all read the same rows. Moving to Postgres means rewriting that
  file and `db.ts`; no page or component changes.
- **`src/lib/ai/provider.ts`** is the single place the product talks to a model.
  No page, component or route handler imports an SDK. Changing model is an
  environment variable; changing vendor is one adapter in that file.

### Stack

Next.js 16 (App Router) · TypeScript · SQLite via `better-sqlite3` · hand-written
CSS · `@anthropic-ai/sdk` · `zod`.

No CSS framework and no component library. A marketplace whose entire job is to
not look like every other marketplace is a poor place to start from someone
else's defaults, and the design tokens at the top of `src/app/globals.css` are
less code than configuring a framework to override itself.

SQLite is a deliberate choice, not a placeholder. This is a small-write,
read-mostly application — a few hundred listings and a handful of submissions a
day — which a single small instance with a mounted volume serves for the cost of
the instance. It also means `npm install && npm run dev` with no services to
start.

### Performance

- The market grid never loads the whole inventory: filters become a SQL `WHERE`,
  page size becomes a `LIMIT`, and pagination walks offsets. Twelve listings per
  request.
- Filters live in the URL, so the grid renders on the server and every filtered
  view is shareable and cacheable.
- Listing pages are pre-rendered and revalidated every five minutes; the home
  page every minute; the account page is always dynamic. Nothing that reads
  inventory is frozen at build time.
- The concierge makes exactly one model call per turn. Constraint extraction is
  regular expressions, not a second round trip.

---

## The AI Concierge

### Why a small model, deliberately

Default: **Claude Haiku 4.5** (`claude-haiku-4-5`) — $1 / $5 per million input /
output tokens, the cheapest current Claude model.

The reasoning is about the shape of the job. By the time the model is called,
the hard part is already done: `concierge.ts` has turned the conversation into a
database query and pulled a short, exact set of real listings. What remains is
reading a dozen structured records, matching them against a stated weight,
budget and use case, and explaining the trade-off in a few sentences. That is
summarisation and explanation over a small, fully supplied context — not
reasoning, not code, not long-horizon planning. A frontier model does it no
better and costs several times more per conversation.

At roughly 3k input and 400 output tokens per turn, that is about **half a US
cent per exchange**; a ten-turn session costs about five cents. Cheap inference
is what lets the concierge stay free and unmetered for buyers, which is the
actual product decision underneath the model choice.

Two further cost controls: `max_tokens` is capped at 1,200 (a recommendation
with reasons, not an essay, and a hard ceiling on what one abusive request can
cost), and `/api/concierge` is rate limited per IP.

### Swapping the model or the provider

```bash
CONCIERGE_MODEL=claude-sonnet-5     # any Claude model id
CONCIERGE_PROVIDER=anthropic        # or "echo" for the offline stub
```

Every model call goes through `getConciergeProvider().stream()` in
`src/lib/ai/provider.ts`. A different vendor means adding one class there that
satisfies the `ConciergeProvider` interface and pointing `CONCIERGE_PROVIDER` at
it. The chat UI, the API route and the retrieval step are all unaware of which
model answered.

The `echo` adapter runs automatically when no API key is set, so a fresh clone,
a CI run and a preview deploy all get a working concierge page instead of an
error. It reads back the shortlist retrieval produced, and the UI says plainly
that it is running offline.

### Grounding — it cannot invent a boat

The model never sees the inventory and is never asked to remember it. Each turn:

1. **Constraints are extracted in code.** Weight, budget (currency-aware —
   £7,000 is not $7,000), boat class, category, apparel size, region, new/used.
   Regular expressions, not a model call. Two ambiguities are handled
   explicitly: a bare "S"/"M"/"L" is only read as a size when the word "size"
   precedes it or the word is spelled out, and "scull" is disambiguated — a
   *single scull* is a boat, a *pair of sculls* is a set of oars, and reading
   the second sense in the first sentence used to return a page of blades.
2. **Those become a `ListingQuery`** and run against the same repository the
   Market page uses. If too little comes back, constraints are relaxed in a
   defined order — and in two tiers. Preferences (new/used, budget, region) are
   relaxed to fill out a thin shortlist; *defining* constraints (boat class, the
   crew weight band, an apparel size) are only dropped when there is nothing at
   all, because a page of singles is not a useful answer to a question about
   eights and a large is not a useful answer to someone who needs a small.
   Whatever was relaxed is passed to the model, which is told to say so.
3. **The model receives that shortlist and nothing else,** with instructions
   that it is the complete set of boats it may recommend.
4. **References are validated on the way out.** `[bx-1001]` codes are matched
   back against the shortlist before becoming links; an id retrieval never
   supplied is stripped rather than rendered as a dead link.
5. **The comparison table is built from inventory data, not from the model's
   prose,** so the numbers in it are always the listing's own.

Replies stream as NDJSON events (`context` → `delta`… → `done`) and are rendered
by a small React-element-building markdown renderer — no `innerHTML`, so model
output can never inject markup.

---

## Design decisions

### Colour

Taken from things you actually look at from a boat, not from a UI kit.

| Token | | |
|---|---|---|
| `--hull` | `#0D242D` | Deep water seen over a gunwale. Primary dark, headers, footers, primary buttons |
| `--bone` | `#F5F1E9` | Boathouse wall, unpainted spruce. The base surface |
| `--bone-2` / `--bone-3` | `#EBE5D9` / `#DFD7C6` | Section banding, recessed surfaces |
| `--green` | `#1D4B3A` | Racing green. Verified badges, new-build tags |
| `--brass-500` | `#C98A34` | Rigger hardware and gate pins. The single accent |
| `--brass-700` | `#8A5714` | The same accent, darkened for small text on bone |
| `--regatta` | `#A32B22` | Sold markers and errors only |
| `--slate` | `#55606A` | Secondary text |

Deliberately no blue-violet, no gradient, no glow. Those read as "software
product", and this is a marketplace for objects that cost as much as a car.
Brass is rationed — primary buttons, the X in the wordmark, eyebrow rules, and
the concierge's live state. Everything else is hull, bone and slate.

Every text pair is measured, not eyeballed; the table is in the header comment
of `globals.css`. The lowest is 4.85:1 and nothing leans on the 3:1 large-text
allowance.

### Type

**Fraunces** for display. A variable serif with an optical-size axis, so one
family carries both the 5rem hero (high contrast, editorial) and a 1.35rem card
heading (sturdy, readable) — a job that usually needs two faces. Its slight
irregularity gives headings a hand-set feel that a neutral serif would not, and
it is not a font anyone reaches for by default.

**Public Sans** for body and UI. A workhorse humanist sans built for dense
public-service interfaces: legible at 13px in a spec table, real tabular figures
for prices and hull weights, and emphatically not Inter or Roboto.

Both self-hosted via `next/font` — no runtime request to Google, no layout shift.

### Photographs

**There are no photographs in this repository.** Adding them requires no code:

```
public/listings/<listing-slug>/01-bow-quarter.jpg
                               02-hull-profile.jpg
                               captions.json          ← alt text and credit
```

Drop image files into a folder named after the listing's slug, restart, and they
become that listing's gallery in filename order. The listing page switches from
the illustration to a real gallery with a thumbnail strip and photographer
credit; the card, the market grid and the concierge results all follow. Listings
without a folder keep the illustration.

`npm run photos` reports coverage: which listings have photographs, which files
are relying on filename-derived alt text rather than written alt text, and
whether any folder name matches no listing — a slug typo is otherwise invisible,
you just never see your photos.

Full conventions, formats and a shot list are in
[`public/listings/README.md`](public/listings/README.md). Images are served
through `next/image`, so upload full-size originals and let it resize per
breakpoint. For photographs on a CDN, put the absolute URL in `photos[].src` and
add the hostname to `images.remotePatterns` in `next.config.mjs`.

### Imagery, while there are no photographs

The two easy answers — grey boxes, or synthetic "boat photos" — would both
cheapen a page where someone is deciding whether to spend £12,000.

Instead every listing gets a flat two-tone illustration built from six
rowing-specific compositions: a hull profile above its reflection on banded
water; blade puddles from above with the wake running off; wing-rigger geometry
drawn as a workshop dimension sketch; a boathouse horizon with dock pilings and
a shell out on the water; an all-in-one flat-laid with a club stripe on the
diagonal; and a cox box in plan view on the same graph paper as the rigger
sketch. Composition follows the listing's category — kit gets kit, a cox box
gets a cox box — and palette and variant come from its `artSeed`, so an item
looks the same everywhere and a grid looks composed rather than random. See
`src/components/HullArt.tsx`.

The gallery labels them as illustration rather than passing them off as
photography, and prints the seller's photo brief for that specific item
underneath. Every seed listing carries a `photoDirection` field describing the
shot that should replace it — three-quarter bow views on flat water at dawn,
rigger castings, honest close-ups of repairs, flat-lays of a full size run.

### Wordmark

"Boat" set light, "Xchange" set heavy, with the X — the only brass element — as
the hinge. Beside it, a cleaver blade seen flat on: the asymmetric quadrilateral
every rower recognises from twenty metres away. `src/components/Wordmark.tsx`.

---

## Inventory

`data/seed-listings.json` holds 46 seed listings across six categories — boats,
oars, riggers, trailers, kit and gear — spanning 27 manufacturers, 5 currencies
and 11 countries. Real manufacturers and model families; invented items, prices,
sellers and locations. **It is demo data, not production inventory.**

It is topped up into SQLite by id on boot: new seed listings appear on the next
start without wiping a database that already holds real seller submissions, and
seed rows already present are left alone rather than being stamped back over.

Real listings arrive through **`/sell` → `POST /api/sell`** and are written with
`source = 'seller'`, so the seed rows can be deleted with one statement once real
inventory exists:

```sql
DELETE FROM listings WHERE source = 'seed';
```

Full schema notes are in `data/README.md`; the authoritative types are in
`src/lib/types.ts`.

### Categories

| Category | | Filters on |
|---|---|---|
| `shell` | Boats | Class, crew weight band, layup, rigging |
| `oars` | Oars & sculls | Sweep vs. sculling, length, condition |
| `rigging` | Riggers & parts | Class it fits, condition |
| `trailer` | Trailers | Capacity, condition |
| `apparel` | Kit & apparel | **Size run, cut, lot size** |
| `gear` | Gear & electronics | Lot size, condition, what's included |

`apparel` and `gear` are separate rather than one "everything else" bucket
because they are searched on different things — nobody filters kit by hull
material and nobody filters a cox box by chest size. The card, the spec sheet,
the filter panel and the sell form all switch on category, so a cox box never
shows an empty "crew weight band" row and a hull is never asked for a size run.

Three fields exist only for these categories: `sizes` (a list, because one club
lot covers a whole size run), `fit` (men's/women's/unisex), and `quantity` — a
club clearing out 22 all-in-ones is solving a different problem from one person
who needs one suit, and buyers filter for exactly that.

Two more fields are worth calling out because a general classifieds schema would
not have them:

- **`crewWeightMinKg` / `crewWeightMaxKg`** — the manufacturer's per-rower weight
  band. It is the spec that decides whether a hull will ever feel right, it is
  the first thing an experienced buyer checks, and most listings elsewhere bury
  it. It is a first-class filter here, and the concierge leans on it hardest.
- **`priceUsd`** — every price normalised to USD at a frozen FX snapshot
  (`src/lib/fx.ts`) so one price filter and one sort order work across five
  currencies. It is an internal sorting key; prices are always *displayed* in the
  seller's own currency. Replace the snapshot with a daily ECB rate job and
  re-derive on the same schedule.

### Syncing external marketplaces — out of scope for v1

Pulling live inventory from eBay, Facebook Marketplace, dealer sites and club
noticeboards is a separate data-pipeline project, not a feature of this app: it
needs a client per source, entity resolution so the same boat listed twice is not
two boats, price normalisation across currencies, and a staleness policy for
listings that vanish silently. It would write into this same `listings` schema,
so nothing in the app would need to change. For now the Sell form plus seed data
is the inventory source.

---

## Stubbed in v1

Each is a self-contained gap, marked with a comment in the file:

- **Authentication.** `/login` collects an email and explains the intended
  emailed-link flow; `/account` renders a fixed demo account. The listings table
  on that page is real — it reads live from the inventory. Wiring real auth means
  replacing `DEMO_ACCOUNT` with the session's seller record and gating the route.
- **Payments.** `/pricing` defines the fee model; `/account` shows a card on file
  and an invoice history as static data. No processor is integrated.
- **Contact form.** Validates and acknowledges in the browser; does not yet post
  anywhere.
- **Seller verification.** Submissions land as `pending` and go live after a
  human check, described on `/about#verification`. The check itself is manual by
  design — for a market where one transaction can be £40,000, unchecked
  instant-publish would be the wrong default.
- **Photo upload.** Sellers describe their photographs; there is no file upload
  or image pipeline yet.
- **Apparel measurements.** Sizes are the letter run only. Brand-to-brand sizing
  varies enough that flat chest and inside-leg measurements would be the real
  fix; for now the listing page tells buyers to ask for them.

## Before you go live

Everything here is invented and has to be replaced. In rough order of how much
trouble it causes if you miss it:

| | Where |
|---|---|
| Your real contact details (all blank — nothing is rendered until you set them) | `src/lib/site.ts` |
| All 46 fabricated listings, sellers and clubs | `DELETE FROM listings WHERE source = 'seed';` |
| Invoice numbers and the demo account | `src/app/account/page.tsx` |
| Fee model — 2% capped at £600, waived under £750, £79/month — is a proposal | `src/app/pricing/page.tsx` and `src/lib/site.ts` |
| The verification process described on /about is a description of intent, not a process that exists | `src/app/about/page.tsx` |
| Auth, payments, contact form delivery and photo upload are all stubbed | see [Stubbed in v1](#stubbed-in-v1) |

The seed listings are the only one of these that can be removed with a single
statement, because they are tagged `source = 'seed'` specifically so they can be.

## Adding listings in bulk

For your own stock, or for listings a seller has given you permission to carry:

```bash
npm run dev                                     # in one terminal
npm run import -- my-stock.csv --dry-run        # validate, write nothing
npm run import -- my-stock.csv                  # create them
```

`data/import-template.csv` is a working two-row example. The importer posts to
`/api/sell` rather than writing to SQLite directly, so every row goes through
exactly the same validation a seller's form submission does — there is no second
copy of the rules to drift. Failures are reported per row and per field; the
rest of the file still imports.

### Reselling your own stock

Boats you buy in to sell on are listed with `sellerType: "platform"`. They carry
a visible **Sold by BoatXchange** badge, a note on the listing page explaining
that you own the boat rather than listing it for someone else, and they are
excluded from commission.

That disclosure is deliberate and worth keeping. A marketplace that quietly
competes with its own sellers stops being trusted the moment anyone notices, and
someone always notices. Being obvious about it costs nothing and removes the
question entirely.

### What the importer is not for

Copying listings — text, photographs, seller contact details — out of other
marketplaces and republishing them here. That is a different act from buying a
boat and reselling it, and it goes wrong in three ways at once: the photographs
belong to whoever took them, the source site's terms almost always forbid it,
and republishing a seller's contact details without asking is a data-protection
problem in the UK and EU.

It also makes a worse product. Those sellers never agreed to sell through you,
so a buyer's enquiry reaches someone with no relationship to your site, about a
boat that may have sold weeks ago.

The version that works is outbound, not automated: find the boat on Facebook or
a club noticeboard, contact the seller, offer to write the listing for them for
free, and use this importer once they say yes. It is slower, it gives you a real
relationship with the supply side, and nobody can take it away from you.

## Deploying

Runs anywhere Node 20+ runs. The one requirement is a **persistent writable
volume** for the SQLite file — set `DATABASE_PATH` to a path on it. On Fly.io,
Railway or Render that is a mounted volume; on a serverless platform with an
ephemeral filesystem, swap `src/lib/db.ts` for a hosted Postgres and rewrite the
queries in `src/lib/inventory.ts`.

Environment variables are documented in `.env.example`.
