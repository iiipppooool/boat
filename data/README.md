# Inventory data

`seed-listings.json` is the **seed** dataset for BoatXchange.

It exists so a fresh install of the site is not empty, and so the AI Concierge has
real records to ground its recommendations in during development. **It is not
production inventory.** Every listing here is fabricated: the manufacturers and
model families are real (that is the point — the filters need to reflect what
rowers actually search for), but the specific boats, prices, sellers, locations
and contact details are invented.

## Replacing it with real inventory

`seed-listings.json` is loaded into SQLite once, on first boot, by
`src/lib/db.ts`. After that the database is the live source of truth and the JSON
file is never read again — new listings arrive through the **Sell a Boat** form
(`/sell` → `POST /api/sell`) and land in the same table.

So the migration path is simply: keep the seed for demos, and let real
seller-submitted listings accumulate alongside it. To purge the seed data once
real inventory exists, delete the rows where `source = 'seed'`:

```sql
DELETE FROM listings WHERE source = 'seed';
```

## Where real inventory could come from later

1. **Seller submissions** (`/sell`) — implemented, and the intended primary source.
2. **Dealer/broker feeds** — dealers on the Boathouse tier would push a CSV/JSON
   feed matching this same schema. Not built.
3. **Syncing external marketplaces** (eBay, Facebook Marketplace, club noticeboards,
   dealer sites) — explicitly *out of scope for v1*. That is a separate
   data-pipeline project: scrapers/API clients per source, entity resolution to
   avoid duplicate boats, price normalisation across currencies, and a staleness
   policy for listings that vanish silently. It would write into this same
   `listings` schema, so nothing in the app would need to change.

## Schema

See `src/lib/types.ts` for the authoritative TypeScript definitions and
`src/lib/db.ts` for the SQL table. Notes on the less obvious fields:

- `crewWeightMinKg` / `crewWeightMaxKg` — the manufacturer's *per-rower* weight
  band. This is the single most important spec for matching a rower to a hull,
  and the concierge leans on it heavily.
- `artSeed` — integer used to deterministically generate the duotone hull artwork
  shown in place of photography. Real listings carry `photos[]` instead.
- `photoDirection` — the art direction brief for the photograph that should
  replace the generated artwork once real imagery exists.
