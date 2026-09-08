import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/ListingCard";
import { ListingGallery } from "@/components/ListingGallery";
import { getAllSlugs, getListingBySlug, getRelatedListings } from "@/lib/inventory";
import { SITE } from "@/lib/site";
import { formatPrice, formatUsdApprox } from "@/lib/fx";
import {
  BOAT_CLASS_LABELS, CATEGORY_LABELS, DISCIPLINE_LABELS, FIT_LABELS,
  GRADE_LABELS, MATERIAL_LABELS, RIGGING_LABELS, SELLER_TYPE_LABELS,
  formatDate, isPlatformOwned, lotSize, metres, relativeDate, sizeRange, weightBand,
} from "@/lib/format";

/**
 * Listing pages are pre-rendered at build time and revalidated every five
 * minutes, so a price change or a sold marking propagates without a redeploy.
 * Listings created after the build render on demand and are cached from then on.
 */
export const revalidate = 300;

/** Pre-render the listings that exist at build time; new ones render on demand. */
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) return { title: "Listing not found" };
  return {
    title: listing.title,
    description: `${listing.title} for sale in ${listing.location.city}, ${listing.location.country}. ${formatPrice(listing.price, listing.currency)}. ${listing.highlights[0] ?? ""}`,
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) notFound();

  const related = getRelatedListings(listing);
  const band = weightBand(listing.crewWeightMinKg, listing.crewWeightMaxKg);
  const classLabel = listing.boatClass
    ? BOAT_CLASS_LABELS[listing.boatClass]
    : CATEGORY_LABELS[listing.category];

  const isApparel = listing.category === "apparel";

  /**
   * The spec sheet is built per category, rows with nothing to say are dropped
   * below, so a cox box does not get an empty "Crew weight band" line and a
   * hull does not get a size run. "Material" is the one label that has to change
   * wording rather than disappear: fabric is not hull material.
   */
  const specs: [string, string | null][] = [
    ["Class", listing.boatClass ? classLabel : null],
    ["Type", listing.boatClass ? null : CATEGORY_LABELS[listing.category]],
    ["Manufacturer", listing.manufacturer],
    ["Model", listing.model],
    ["Year", String(listing.year)],
    ["Condition", GRADE_LABELS[listing.conditionGrade]],
    ["Discipline", listing.discipline ? DISCIPLINE_LABELS[listing.discipline] : null],
    ["Sizes", sizeRange(listing.sizes)],
    ["Cut", listing.fit ? FIT_LABELS[listing.fit] : null],
    ["Quantity", lotSize(listing.quantity)],
    ["Seats", listing.seats ? String(listing.seats) : null],
    ["Coxed", listing.coxed == null ? null : listing.coxed ? "Yes" : "No"],
    [isApparel ? "Fabric" : "Material", MATERIAL_LABELS[listing.material]],
    ["Rigging", listing.rigging ? RIGGING_LABELS[listing.rigging] : null],
    ["Crew weight band", band],
    ["Hull weight", listing.hullWeightKg ? `${listing.hullWeightKg} kg` : null],
    ["Length", metres(listing.lengthCm)],
    [
      "Location",
      `${listing.location.city}, ${listing.location.region}, ${listing.location.country}`,
    ],
  ];

  return (
    <article className="listing section-tight">
      <div className="wrap">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/market">Market</Link></li>
            {listing.boatClass && (
              <li>
                <Link href={`/market?boatClass=${encodeURIComponent(listing.boatClass)}`}>
                  {classLabel}
                </Link>
              </li>
            )}
            <li aria-current="page">{listing.title}</li>
          </ol>
        </nav>

        <div className="listing-layout">
          <div className="listing-main">
            <header className="listing-header">
              <div className="cluster">
                <span className="pill pill-accent">{classLabel}</span>
                {isPlatformOwned(listing.seller.type) && (
                  <span className="pill pill-platform">Sold by BoatXchange</span>
                )}
                {listing.source === "aggregated" && (
                  <span className="pill">Listed on {listing.sourceName}</span>
                )}
                {listing.condition === "new" && <span className="pill pill-new">New build</span>}
                {listing.status === "pending" && <span className="pill pill-pending">Sale pending</span>}
                {listing.status === "sold" && <span className="pill pill-sold">Sold</span>}
              </div>
              <h1>{listing.title}</h1>
              <p className="listing-sub muted small">
                Listed {relativeDate(listing.listedAt)} · last updated{" "}
                {relativeDate(listing.updatedAt)} · reference {listing.id}
              </p>
            </header>

            <ListingGallery
              photos={listing.photos}
              seed={listing.artSeed}
              category={listing.category}
              title={listing.title}
              direction={listing.photoDirection}
            />

            <section className="listing-section" aria-labelledby="highlights">
              <h2 id="highlights" className="listing-h2">At a glance</h2>
              <ul className="highlight-list">
                {listing.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>

            <section className="listing-section" aria-labelledby="description">
              <h2 id="description" className="listing-h2">From the seller</h2>
              <p className="listing-description">{listing.description}</p>
            </section>

            <section className="listing-section" aria-labelledby="specs">
              <h2 id="specs" className="listing-h2">Full specification</h2>
              <div className="table-scroll">
                <table className="spec-table">
                  <caption className="visually-hidden">
                    Specification for {listing.title}
                  </caption>
                  <tbody>
                    {specs
                      .filter((row): row is [string, string] => row[1] != null)
                      .map(([label, value]) => (
                        <tr key={label}>
                          <th scope="row">{label}</th>
                          <td>{value}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {isApparel && sizeRange(listing.sizes) && (
                <p className="notice mt-5">
                  <strong>On sizing.</strong> Racing kit runs small, and it runs small
                  differently at every brand, a {listing.manufacturer} medium is not a
                  medium anywhere else. Ask the seller for the flat measurement across
                  the chest and the inside leg before you commit, particularly on a
                  lot you cannot return.
                </p>
              )}
              {band && (
                <p className="notice mt-5">
                  <strong>On the weight band.</strong> {listing.manufacturer} publishes
                  this hull for rowers of {band}. Outside it a boat sits too deep or too
                  high and never feels right, whatever you do to the rigging, it is the
                  first thing to check, and the most common reason a good boat turns out
                  to be the wrong boat.
                </p>
              )}
            </section>
          </div>

          <aside className="listing-aside">
            <div className="panel listing-buy">
              <p className="listing-price">{formatPrice(listing.price, listing.currency)}</p>
              <p className="listing-price-note small muted">
                {listing.priceBasis === "ono" && "Or nearest offer · "}
                {listing.priceBasis === "poa" && "Indicative, final quote on application · "}
                approx. {formatUsdApprox(listing.priceUsd)}
              </p>

              {listing.status === "sold" ? (
                <p className="notice mt-4">
                  <strong>This boat has sold.</strong> Sold listings stay up for six
                  months so buyers and sellers can see what boats actually trade for.
                </p>
              ) : (
                <div className="stack mt-4">
                  {/* An aggregated listing is a signpost, not something we hold.
                      Offering to "contact the seller" would be a lie: they have
                      no relationship with us and may have sold it weeks ago. */}
                  {listing.source === "aggregated" && listing.sourceUrl ? (
                    <a
                      href={listing.sourceUrl}
                      className="btn btn-accent btn-block"
                      rel="nofollow noreferrer"
                      target="_blank"
                    >
                      View on {listing.sourceName ?? "the source site"} →
                    </a>
                  ) : SITE.contact.email ? (
                    <a
                      href={`mailto:${SITE.contact.email}?subject=${encodeURIComponent(`Enquiry: ${listing.title} (${listing.id})`)}`}
                      className="btn btn-accent btn-block"
                    >
                      Contact the seller
                    </a>
                  ) : (
                    <Link href={`/contact?listing=${listing.slug}`} className="btn btn-accent btn-block">
                      Contact the seller
                    </Link>
                  )}
                  <Link href={`/concierge?listing=${listing.slug}`} className="btn btn-ghost btn-block">
                    Ask the concierge about this boat
                  </Link>
                </div>
              )}

              <dl className="seller-facts">
                <div>
                  <dt>Seller</dt>
                  <dd>
                    {listing.seller.name}
                    {listing.seller.verified && (
                      <span className="pill pill-verified">Verified</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{SELLER_TYPE_LABELS[listing.seller.type]}</dd>
                </div>
                <div>
                  <dt>On BoatXchange since</dt>
                  <dd>{listing.seller.memberSince}</dd>
                </div>
                <div>
                  <dt>Typical reply</dt>
                  <dd>within {listing.seller.responseHours} hours</dd>
                </div>
                <div>
                  <dt>Listed</dt>
                  <dd>{formatDate(listing.listedAt)}</dd>
                </div>
              </dl>

              {listing.source === "aggregated" && (
                <p className="notice mt-4">
                  <strong>Listed elsewhere.</strong> This boat is for sale on{" "}
                  {listing.sourceName}, not on BoatXchange. We show it so you can
                  find it, and send you there to buy it, the price and availability
                  are theirs, and may have moved since we last checked.
                </p>
              )}
              {isPlatformOwned(listing.seller.type) && (
                <p className="notice mt-4">
                  <strong>We own this one.</strong> BoatXchange bought this boat to
                  sell on, so you are buying from us rather than through us. No
                  commission is charged on it, and it gets no special placement in
                  search or in concierge results.
                </p>
              )}
              <p className="tiny muted mt-4">
                {listing.seller.verified ? (
                  <>
                    BoatXchange has confirmed this seller&rsquo;s identity and that they
                    own the boat. <Link href="/about#verification">How we check</Link>.
                  </>
                ) : (
                  <>
                    This seller has not completed verification yet. Inspect before you
                    pay, and read <Link href="/about#verification">our guidance</Link>.
                  </>
                )}
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="listing-related section-tight" aria-labelledby="related">
            <div className="section-head">
              <div>
                <p className="eyebrow">Comparable</p>
                <h2 id="related">Others worth a look</h2>
              </div>
              {listing.boatClass && (
                <Link
                  href={`/market?boatClass=${encodeURIComponent(listing.boatClass)}`}
                  className="link-arrow"
                >
                  See all {classLabel.toLowerCase()}
                </Link>
              )}
            </div>
            <div className="grid-cards">
              {related.map((r) => (
                <ListingCard key={r.id} listing={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
