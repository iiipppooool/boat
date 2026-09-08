# Listing sources

How inventory gets onto BoatXchange. There are three routes, and the difference
between them matters more than it might look.

| Route | `source` | Who holds the sale | Buyer action |
|---|---|---|---|
| Seller submits it | `seller` | The seller, via us | Contact the seller |
| We bought it to sell on | `seller` + `sellerType: "platform"` | Us | Contact us |
| Licensed feed from another site | `aggregated` | The other site | **Link out to them** |

## Aggregated listings

An aggregated listing is a **signpost, not inventory**. It carries `sourceUrl`
and `sourceName`, and the detail page:

- badges it "Listed on <source>"
- says plainly that the boat is for sale elsewhere and the price may have moved
- replaces "Contact the seller" with "View on <source> →", `rel="nofollow"`

That last part is the whole design. Offering to put a buyer in touch with a
seller who has never heard of us would be a lie, and it produces the failure
mode that kills new marketplaces: enquiries you cannot fulfil, about boats that
sold weeks ago.

This is the same pattern Skyscanner and Google Shopping use, and it is the only
version of "listings from other websites" that is both legal and a good product.

## Writing an adapter

```ts
import type { SourceAdapter } from "./types";

export const myFeed: SourceAdapter = {
  name: "Example Marketplace",
  async fetchListings() {
    // Call the source's official API with your own key.
    // Map its response onto AggregatedListing. Return [] on failure,
    // never throw: one broken feed must not empty the market.
    return [];
  },
};
```

Register it in `registry.ts` and run `npm run sync-sources`.

### Where feeds legitimately come from

- **An official API with an affiliate or partner programme.** eBay's Partner
  Network is the obvious one for used boats and kit: you register, get a key, and
  their terms permit displaying results with links back. Check the current terms
  yourself, they change, and they are the thing that makes this lawful.
- **A dealer who gives you their feed.** Ask. Dealers on the Boathouse tier
  actively want their stock in front of buyers, and a CSV or JSON feed is a
  five-minute conversation.
- **A club that wants its noticeboard mirrored.** Same conversation, smaller.

### Where they do not

Scraping a marketplace and republishing its listings. The photographs belong to
whoever took them, the source's terms will forbid it, and republishing a
seller's contact details without asking is a data-protection problem in the UK
and EU. `npm run import` exists for listings you have permission to carry, use
it after someone says yes, not instead of asking.
