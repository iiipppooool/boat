import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { MarketFilters } from "@/components/MarketFilters";
import { Pagination } from "@/components/Pagination";
import { SortControl } from "@/components/SortControl";
import { getFacets, searchListings } from "@/lib/inventory";
import { countActiveFilters, parseListingQuery } from "@/lib/query";

export const metadata: Metadata = {
  title: "Market",
  description:
    "Every rowing boat currently for sale on BoatXchange: singles, doubles, quads, fours, eights, coastal hulls, oars, riggers and trailers, filtered by class, weight band, material, price and region.",
};

/**
 * The Market grid renders on the server from the URL, twelve listings at a time.
 * Nothing loads the whole inventory: the filters become a SQL WHERE clause, the
 * page size becomes a LIMIT, and the only thing shipped to the browser is the
 * page you asked for.
 */
export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseListingQuery(params);
  const { listings, total, page, pageCount, perPage } = searchListings(query);
  const facets = getFacets();
  const activeCount = countActiveFilters(query);

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <p className="eyebrow">The market</p>
          <div className="page-head-grid">
            <h1>Every rowing boat currently for sale.</h1>
            <p className="lede">
              {facets.availableTotal} live listings from clubs, dealers, builders and
              private owners across {facets.continents.length} continents. Filter by
              class, crew weight band, material or region — or{" "}
              <Link href="/concierge">ask the concierge</Link> to do it for you.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap market-layout">
        <aside className="market-sidebar" aria-label="Filter listings">
          <MarketFilters query={query} facets={facets} activeCount={activeCount} />
        </aside>

        <section className="market-results" aria-label="Listings">
          <div className="market-results-head">
            <p className="market-count" aria-live="polite">
              {total === 0 ? (
                "No boats match those filters"
              ) : (
                <>
                  <strong>
                    {first}–{last}
                  </strong>{" "}
                  of <strong>{total}</strong> {total === 1 ? "listing" : "listings"}
                </>
              )}
            </p>
            <SortControl value={query.sort ?? "newest"} />
          </div>

          {total === 0 ? (
            <div className="panel empty-state">
              <h2>Nothing matches — yet</h2>
              <p className="muted">
                Rowing is a small market and the right boat often is not listed on the
                day you look for it. Two things worth trying: widen the crew weight band
                by a couple of kilos, since manufacturers publish these conservatively,
                or drop the region filter — most sellers here will arrange freight.
              </p>
              <div className="cluster">
                <Link href="/market" className="btn">
                  Clear all filters
                </Link>
                <Link href="/concierge" className="btn btn-ghost">
                  Ask the concierge instead
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid-cards">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
              <Pagination query={query} page={page} pageCount={pageCount} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
