import Link from "next/link";
import { HullArt } from "./HullArt";
import { formatPrice } from "@/lib/fx";
import { BOAT_CLASS_LABELS, CATEGORY_LABELS, GRADE_LABELS, relativeDate, weightBand } from "@/lib/format";
import type { Listing } from "@/lib/types";

export function ListingCard({ listing }: { listing: Listing }) {
  const band = weightBand(listing.crewWeightMinKg, listing.crewWeightMaxKg);
  const classLabel = listing.boatClass
    ? BOAT_CLASS_LABELS[listing.boatClass]
    : CATEGORY_LABELS[listing.category];

  return (
    <article className={`card${listing.status === "sold" ? " card-sold" : ""}`}>
      {/* The whole card is one click target via the stretched title link below,
          so the artwork is not a second link — one tab stop per listing. */}
      <div className="card-media">
        <HullArt
          seed={listing.artSeed}
          category={listing.category}
          label={`Illustration standing in for photography of ${listing.title}`}
        />
        <div className="card-media-tags">
          {listing.condition === "new" && <span className="pill pill-new">New build</span>}
          {listing.status === "sold" && <span className="pill pill-sold">Sold</span>}
          {listing.status === "pending" && <span className="pill pill-pending">Sale pending</span>}
        </div>
      </div>

      <div className="card-body">
        <p className="card-kicker">
          {classLabel}
          <span aria-hidden="true"> · </span>
          {listing.manufacturer}
        </p>

        <h3 className="card-title">
          <Link href={`/market/${listing.slug}`}>{listing.title}</Link>
        </h3>

        <dl className="card-specs">
          <div>
            <dt>Condition</dt>
            <dd>{GRADE_LABELS[listing.conditionGrade]}</dd>
          </div>
          {band && (
            <div>
              <dt>Crew weight</dt>
              <dd>{band}</dd>
            </div>
          )}
          <div>
            <dt>Location</dt>
            <dd>
              {listing.location.city}, {listing.location.countryCode}
            </dd>
          </div>
        </dl>

        <div className="card-foot">
          <p className="card-price">
            {listing.priceBasis === "poa" ? (
              <>
                <span className="card-price-value">{formatPrice(listing.price, listing.currency)}</span>
                <span className="card-price-note">indicative</span>
              </>
            ) : (
              <>
                <span className="card-price-value">{formatPrice(listing.price, listing.currency)}</span>
                {listing.priceBasis === "ono" && <span className="card-price-note">or near offer</span>}
              </>
            )}
          </p>
          <p className="card-meta tiny">
            {listing.seller.verified && (
              <span className="pill pill-verified" title="Identity and ownership confirmed by BoatXchange">
                Verified
              </span>
            )}
            <span className="muted">Updated {relativeDate(listing.updatedAt)}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
