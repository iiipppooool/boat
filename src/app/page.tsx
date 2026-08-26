import Link from "next/link";
import { HullArt } from "@/components/HullArt";
import { ListingCard } from "@/components/ListingCard";
import { getFacets, getFeaturedListings } from "@/lib/inventory";
import { BOAT_CLASS_LABELS } from "@/lib/format";

/**
 * The home page reads live inventory (recent listings, market totals), so it is
 * regenerated at most once a minute rather than frozen at build time. A boat
 * listed this morning appears here without a redeploy.
 */
export const revalidate = 60;


/** Lane markers — the buoy line every rower has stared down for 2,000 metres. */
function LaneMarkers({ count = 9 }: { count?: number }) {
  return (
    <span className="lane-markers" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} data-lane={i % 3} />
      ))}
    </span>
  );
}

const BROWSE_BY: { href: string; label: string; note: string }[] = [
  { href: "/market?boatClass=1x", label: BOAT_CLASS_LABELS["1x"], note: "Racing and recreational" },
  { href: "/market?boatClass=2x", label: BOAT_CLASS_LABELS["2x"], note: "Doubles" },
  { href: "/market?boatClass=4x&boatClass=4-&boatClass=4%2B", label: "Fours & quads", note: "Coxed and coxless" },
  { href: "/market?boatClass=8%2B", label: BOAT_CLASS_LABELS["8+"], note: "Club and racing eights" },
  { href: "/market?discipline=coastal", label: "Coastal", note: "Open water and beach starts" },
  { href: "/market?category=oars", label: "Oars & sculls", note: "Sweep and sculling" },
  { href: "/market?category=trailer", label: "Trailers", note: "Club and regatta" },
  { href: "/market?category=rigging", label: "Riggers & parts", note: "Spares and hardware" },
];

export default function HomePage() {
  const featured = getFeaturedListings(6);
  const facets = getFacets();

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="hero on-hull">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <LaneMarkers />
            <p className="eyebrow">New &amp; used · worldwide</p>
            <h1>
              The global marketplace
              <br />
              for rowing boats.
            </h1>
            <p className="lede">
              Singles, doubles, quads, fours, eights and coastal hulls — plus the
              oars, riggers and trailers that go with them. Sold by clubs, builders,
              dealers and the person who rowed it last.
            </p>
            <div className="cluster hero-actions">
              <Link href="/market" className="btn btn-accent btn-lg">
                Browse {facets.availableTotal} listings
              </Link>
              <Link href="/concierge" className="btn btn-ghost btn-lg">
                Ask the AI concierge
              </Link>
            </div>
            <p className="hero-note small">
              Free to browse. Sellers pay only when a boat sells.
            </p>
          </div>

          <div className="hero-art" aria-hidden="true">
            <HullArt seed={7} scene="waterline" ratio={0.78} />
          </div>
        </div>

        <div className="hero-stats">
          <div className="wrap">
            <dl>
              <div>
                <dt>Boats and equipment listed</dt>
                <dd>{facets.total}</dd>
              </div>
              <div>
                <dt>Manufacturers represented</dt>
                <dd>{facets.manufacturers.length}</dd>
              </div>
              <div>
                <dt>Countries</dt>
                <dd>{facets.continents.length} continents</dd>
              </div>
              <div>
                <dt>Dedicated rowing marketplaces before this one</dt>
                <dd>0</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---------- The gap ---------- */}
      <section className="section">
        <div className="wrap gap-grid">
          <div>
            <p className="eyebrow">Why this exists</p>
            <h2>
              Sailing has YachtWorld. Powerboats have Boats.com. Rowing has a
              club noticeboard and a Facebook group.
            </h2>
          </div>
          <div className="gap-copy">
            <p>
              A racing eight costs more than most family cars, and until now it was
              sold the way a second-hand sofa is sold: a photo on a phone, a price in
              a comment thread, and a buyer three time zones away who has no way to
              know whether the hull has been holed.
            </p>
            <p>
              Rowing is small enough that nobody built it a marketplace, and specific
              enough that a generic one would not work. A boat listing needs a crew
              weight band, a layup, a rigger type and an honest account of every
              repair — the fields that decide whether a boat is right, and the fields
              a general classifieds site does not have.
            </p>
            <p>
              <Link href="/about" className="link-arrow">
                How BoatXchange works
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Trust ---------- */}
      <section className="section-tight on-bone-2 trust-band">
        <div className="wrap">
          <ul className="trust-list">
            <li>
              <h3>Sellers are checked</h3>
              <p>
                Verified sellers have confirmed their identity and that they own the
                boat. Unverified listings say so, plainly, on the listing itself.
              </p>
            </li>
            <li>
              <h3>Specs that actually matter</h3>
              <p>
                Crew weight band, layup, hull weight, rigging and repair history on
                every boat — not just a price and three photographs.
              </p>
            </li>
            <li>
              <h3>Prices you can compare</h3>
              <p>
                Listings stay up for six months after they sell, so you can see what
                boats trade for rather than what people ask.
              </p>
            </li>
            <li>
              <h3>No listing fees</h3>
              <p>
                Listing is free for private sellers and clubs. We take a fee only when
                a boat actually sells.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- Recent listings ---------- */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Latest</p>
              <h2>Recently listed and updated</h2>
              <p>
                The market moves slowly and then all at once — most club fleets turn
                over in the two months after a season ends.
              </p>
            </div>
            <Link href="/market" className="link-arrow">
              See the whole market
            </Link>
          </div>

          <div className="grid-cards">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Concierge ---------- */}
      <section className="section on-hull concierge-band">
        <div className="wrap concierge-band-grid">
          <div>
            <p className="eyebrow">AI Concierge</p>
            <h2>&ldquo;I&rsquo;m 71 kg, rowed for three years, and I have €9,000.&rdquo;</h2>
            <p className="lede">
              Tell the concierge what you weigh, what you can spend and what you want
              to do on the water. It reads the live inventory before it answers, so
              every boat it recommends is one you can go and buy today — with the
              reasoning, and the trade-offs, spelled out.
            </p>
            <div className="cluster mt-5">
              <Link href="/concierge" className="btn btn-accent">
                Start a conversation
              </Link>
              <Link href="/about#concierge" className="btn btn-ghost">
                How it stays honest
              </Link>
            </div>
          </div>
          <ul className="concierge-band-points">
            <li>
              <span>01</span>
              <p>
                <strong>It cannot invent a boat.</strong> The model is only shown
                listings retrieved from the live database, and can only recommend from
                that set.
              </p>
            </li>
            <li>
              <span>02</span>
              <p>
                <strong>It checks the weight band first.</strong> The spec that decides
                whether a hull will ever feel right, and the one most listings bury.
              </p>
            </li>
            <li>
              <span>03</span>
              <p>
                <strong>It will compare two or three properly</strong> rather than hand
                you a list of eight and call it advice.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- Browse by type ---------- */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Browse</p>
              <h2>Start with the boat you need</h2>
            </div>
          </div>
          <ul className="browse-grid">
            {BROWSE_BY.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <strong>{item.label}</strong>
                  <span className="small muted">{item.note}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Sell CTA ---------- */}
      <section className="section-tight">
        <div className="wrap">
          <div className="sell-cta">
            <div>
              <p className="eyebrow">Selling</p>
              <h2>Got a boat in the rack you no longer row?</h2>
              <p className="muted">
                Listing is free. We charge 4% when it sells, capped at £600, and
                nothing at all if it does not. Clubs and dealers with fleets to move
                have their own tier.
              </p>
            </div>
            <div className="cluster">
              <Link href="/sell" className="btn btn-lg">
                List a boat
              </Link>
              <Link href="/pricing" className="btn btn-ghost btn-lg">
                See the fees
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
