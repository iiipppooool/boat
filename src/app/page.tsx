import Link from "next/link";
import type { Metadata } from "next";
import { HullArt } from "@/components/HullArt";
import { ListingCard } from "@/components/ListingCard";
import { WaitlistForm } from "@/components/WaitlistForm";
import { MoneyFlow } from "@/components/landing/MoneyFlow";
import { getFacets, getFeaturedListings } from "@/lib/inventory";
import { waitlistStats } from "@/lib/waitlist";
import { aggregatedCount, lastSyncAt } from "@/lib/sources/sync";
import { BOAT_CLASS_LABELS } from "@/lib/format";
import { SITE } from "@/lib/site";

/**
 * The landing page.
 *
 * It has two jobs that pull in opposite directions: explain a marketplace that
 * is still being built, and collect the email address of somebody who wants it.
 * The resolution is the order. The waiting list is offered in the first
 * screenful for the person who already knows they want in, and offered again at
 * the bottom for the person who needed the argument first. Everything between
 * the two is the argument.
 *
 * Live figures (inventory counts, waiting-list size) are read at render, so the
 * page is revalidated rather than frozen at build time. Where a real number is
 * too small to be worth showing, it is omitted rather than dressed up. See
 * `waitlistStats().showCount`.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "BoatXchange: the marketplace for every boat, starting with rowing",
  description:
    "Buy and sell boats, oars, riggers, trailers, helmets, kit and gear in one place. Free to list, commission only on a sale, and we never hold your money. Join the waiting list.",
  alternates: { canonical: "/" },
};

/** "3 minutes ago" for the freshness line, without pulling in a date library. */
function relativeSync(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 2) return "moments ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/** Lane markers: the buoy line every rower has stared down for 2,000 metres. */
function LaneMarkers({ count = 9 }: { count?: number }) {
  return (
    <span className="lane-markers" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} data-lane={i % 3} />
      ))}
    </span>
  );
}

const PRODUCTS: {
  kicker: string;
  title: string;
  body: string;
  points: string[];
  href: string;
  cta: string;
  status: "live" | "soon" | "later";
}[] = [
  {
    kicker: "Hulls",
    title: "Boats, every class",
    body:
      "Singles, doubles, pairs, quads, fours, eights and coastal hulls, from a first plastic trainer to a carbon eight that costs more than a car. New from builders, used from clubs, dealers and the person who rowed it last.",
    points: [
      "Crew weight band, layup and hull weight on every listing",
      "Repair history stated, not discovered on collection",
      "Sold listings stay visible for six months so you can see real prices",
    ],
    href: "/market?category=shell",
    cta: "Browse boats",
    status: "live",
  },
  {
    kicker: "Blades",
    title: "Oars & sculls",
    body:
      "Sweep and sculling blades are the most traded item in the sport and the worst served: a set outlives three crews, and every club has a rack of the wrong length. Listed by length, stiffness, blade shape and collar type, the four things that decide whether they fit.",
    points: [
      "Matched sets and odd blades both listed properly",
      "Length and stiffness are fields, not a sentence in the description",
      "Our own line of blades once the market is big enough to make it worth building",
    ],
    href: "/market?category=oars",
    cta: "Browse oars",
    status: "live",
  },
  {
    kicker: "Kit",
    title: "Merch, apparel & club kit",
    body:
      "All-in-ones, trou, splash tops, pogies and the training kit that wears out every season. Club lots, dead stock from a supplier who over-ordered, and, as we grow, BoatXchange's own range, built to last more than one winter.",
    points: [
      "Sized properly, with the fit stated: nothing about rowing kit is standard",
      "Club bulk lots as a single listing rather than forty",
      "Own-brand kit designed and sold direct, so the margin is not three deep",
    ],
    href: "/market?category=apparel",
    cta: "Browse kit",
    status: "live",
  },
  {
    kicker: "Safety",
    title: "Helmets & safety gear",
    body:
      "Coastal and offshore rowing needs a helmet, a buoyancy aid and a light, and no one place sells them fitted to a rowing boat. Launch and cox kit too: throw lines, flares, heel restraints, engine-cut lanyards.",
    points: [
      "Certification stated on every safety listing, or it does not go live",
      "Sized and fitted for coastal and offshore, not borrowed from cycling",
      "Own-brand helmets and buoyancy aids on the roadmap",
    ],
    href: "/market?category=gear",
    cta: "Browse safety & gear",
    status: "soon",
  },
  {
    kicker: "Electronics",
    title: "Gear, cox boxes & ergs",
    body:
      "Cox boxes, stroke coaches, impellers, speed sensors, heart-rate straps and second-hand ergs. The category where a working unit and a broken one look identical in a photograph, so the listing has to say which it is.",
    points: [
      "Working state and included cables listed as fields",
      "Battery and service history where a seller has it",
      "Ergs listed with hours where the monitor reports them",
    ],
    href: "/market?category=gear",
    cta: "Browse gear",
    status: "live",
  },
  {
    kicker: "Logistics",
    title: "Trailers, riggers & spares",
    body:
      "The parts nobody photographs and everybody needs: riggers, seats, wheels, tracks, gates, fins, shoes, and the trailer that gets eight boats to a regatta three counties away.",
    points: [
      "Fits-what compatibility on rigger and hardware listings",
      "Trailer capacity and towing weight stated",
      "Spares from clubs clearing a shed, the cheapest way to keep a fleet running",
    ],
    href: "/market?category=trailer",
    cta: "Browse trailers & parts",
    status: "live",
  },
  {
    kicker: "Access",
    title: "Rent a boat, anywhere",
    body:
      "The long game. Most boats sit still for most of the year, and a rower travelling to a regatta or a holiday coastline has nowhere to hire one. When the marketplace is dense enough, the same listings become rentable by the day, with the club or owner setting the price and the terms.",
    points: [
      "Club fleets earning in the months they would otherwise sit in the rack",
      "Insurance and deposit handled by the platform, money still never held by us",
      "Regatta-week hire in a city you have never rowed in",
    ],
    href: "#waitlist",
    cta: "Tell us you want this",
    status: "later",
  },
];

const STATUS_LABEL: Record<"live" | "soon" | "later", string> = {
  live: "Listed today",
  soon: "Opening next",
  later: "On the roadmap",
};

const BROWSE_BY: { href: string; label: string; note: string }[] = [
  { href: "/market?boatClass=1x", label: BOAT_CLASS_LABELS["1x"], note: "Racing and recreational" },
  { href: "/market?boatClass=2x", label: BOAT_CLASS_LABELS["2x"], note: "Doubles" },
  { href: "/market?boatClass=4x&boatClass=4-&boatClass=4%2B", label: "Fours & quads", note: "Coxed and coxless" },
  { href: "/market?boatClass=8%2B", label: BOAT_CLASS_LABELS["8+"], note: "Club and racing eights" },
  { href: "/market?discipline=coastal", label: "Coastal", note: "Open water and beach starts" },
  { href: "/market?category=oars", label: "Oars & sculls", note: "Sweep and sculling" },
  { href: "/market?category=apparel", label: "Kit & apparel", note: "All-in-ones, trou, splash tops" },
  { href: "/market?category=gear", label: "Gear & electronics", note: "Cox boxes, stroke coaches, ergs" },
  { href: "/market?category=trailer", label: "Trailers", note: "Club and regatta" },
  { href: "/market?category=rigging", label: "Riggers & parts", note: "Spares and hardware" },
];

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What does it cost?",
    a: (
      <>
        <p>
          Browsing is free and always will be. Listing is free: for private
          sellers, for clubs, for dealers. We charge a commission of{" "}
          {Math.round(SITE.fees.rate * 100)}% only when something actually sells,
          capped at {SITE.fees.currencySymbol}
          {SITE.fees.cap}, and nothing at all on a sale under{" "}
          {SITE.fees.currencySymbol}
          {SITE.fees.freeBelow}.
        </p>
        <p>
          A club selling a {SITE.fees.currencySymbol}400 set of blades pays
          nothing. A club selling a {SITE.fees.currencySymbol}12,000 four pays{" "}
          {SITE.fees.currencySymbol}240. If it does not sell, you owe nothing.
        </p>
      </>
    ),
  },
  {
    q: "Do you take the payment?",
    a: (
      <>
        <p>
          No, and this is the part we would ask you to check on any competitor.
          Buyer and seller settle directly: bank transfer, in person, or through
          whichever escrow the two of them choose for a boat worth escrowing.
        </p>
        <p>
          We invoice our commission to the seller after the sale. Your money never
          sits in our account, so there is no float for us to earn on, no payout
          delay to chase, and nothing of yours to lose if we have a bad year.
        </p>
      </>
    ),
  },
  {
    q: "How do I know a listing is real?",
    a: (
      <p>
        Every submission is checked by a person before it goes live, and verified
        sellers have confirmed both their identity and that they own the boat. A
        listing that has not been verified says so on the listing itself, in the
        same size type as everything else. We would rather tell you what we do not
        know than imply we checked something we did not.
      </p>
    ),
  },
  {
    q: "I row somewhere small. Will there be anything near me?",
    a: (
      <p>
        Probably not on day one, which is why the waiting list asks for your
        country. We open region by region and we start where the most of you are.
        a marketplace with three boats in your country is worse than no
        marketplace, because it teaches you not to come back. Tell us where you
        are and you are voting for your region.
      </p>
    ),
  },
  {
    q: "Is this only rowing?",
    a: (
      <p>
        Rowing first, because it is the sport we know, the one with no marketplace
        of its own, and small enough to actually finish. The mechanics, long-lived
        expensive hulls, specs that decide a purchase, sellers who are clubs rather
        than dealers, are the same for kayaks, canoes, dinghies and small sail. We
        will expand into them once rowing works properly, and not before.
      </p>
    ),
  },
  {
    q: "What happens when I join the list?",
    a: (
      <p>
        You get one confirmation email, and then nothing until the market opens
        where you are, or until there is something genuinely worth telling you. No
        weekly newsletter. One click to leave, from any email we send.
      </p>
    ),
  },
];

export default function HomePage() {
  const featured = getFeaturedListings(6);
  const facets = getFacets();
  const waiting = waitlistStats();
  const aggregated = aggregatedCount();
  const synced = lastSyncAt();

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="hero on-hull">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <LaneMarkers />
            <p className="eyebrow">Boats · oars · gear · kit · new &amp; used</p>
            <h1>
              Every boat,
              <br />
              one market.
            </h1>
            <p className="lede">
              BoatXchange is the marketplace rowing never had: hulls, blades,
              riggers, trailers, helmets, kit and gear, listed with the specs that
              actually decide a purchase. Free to list. Commission only when it
              sells. <strong>We never hold your money.</strong>
            </p>

            <div className="hero-waitlist" id="join">
              <WaitlistForm variant="compact" />
            </div>

            <p className="hero-note small">
              {waiting.showCount
                ? `${waiting.count} rowers, coaches and clubs are already on the list.`
                : "Early access opens region by region, to the list first."}{" "}
              <Link href="/market">Or look at what is listed today →</Link>
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
                <dt>Listed on the market today</dt>
                <dd>{facets.total}</dd>
              </div>
              <div>
                <dt>Manufacturers represented</dt>
                <dd>{facets.manufacturers.length}</dd>
              </div>
              <div>
                <dt>Continents covered</dt>
                <dd>{facets.continents.length}</dd>
              </div>
              <div>
                <dt>Of your money we ever hold</dt>
                <dd>{SITE.fees.currencySymbol}0</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---------- The problem ---------- */}
      <section className="section" id="problem">
        <div className="wrap gap-grid">
          <div>
            <p className="eyebrow">The problem</p>
            <h2>
              Sailing has YachtWorld. Powerboats have Boats.com. Rowing has a club
              noticeboard and a Facebook group.
            </h2>
          </div>
          <div className="gap-copy">
            <p>
              A racing eight costs more than most family cars, and until now it was
              sold the way a second-hand sofa is sold: a photo taken on a phone, a
              price in a comment thread, and a buyer three time zones away with no
              way to know whether the hull has been holed and filled.
            </p>
            <p>
              Rowing is small enough that nobody built it a marketplace, and specific
              enough that a generic one would not work. A boat listing needs a crew
              weight band, a layup, a rigger type and an honest account of every
              repair. Those are the fields that decide whether a boat is right, and the fields
              a general classifieds site does not have.
            </p>
          </div>
        </div>

        {/* The headline says rowing has a club noticeboard. So this is one:
            four cards pinned to a board, because the design of the section
            should be the joke the copy is making. */}
        <div className="wrap noticeboard-wrap">
          <div className="noticeboard">
            <p className="noticeboard-label" aria-hidden="true">
              Club noticeboard · please do not remove
            </p>
            <ul className="noticeboard-cards">
              <li>
                <span className="pin" aria-hidden="true" />
                <h3>Nobody can find anything</h3>
                <p>
                  The boat you want exists. It is in a rack four hours away, and the
                  only person who knows it is for sale is the club captain who
                  mentioned it once at a regatta.
                </p>
              </li>
              <li>
                <span className="pin" aria-hidden="true" />
                <h3>Nobody knows what anything is worth</h3>
                <p>
                  With no visible sold prices, every negotiation starts from scratch.
                  Clubs undersell fleets by thousands; private sellers ask twice what a
                  hull will fetch and it sits in the rack for a year.
                </p>
              </li>
              <li>
                <span className="pin" aria-hidden="true" />
                <h3>The listings leave out what matters</h3>
                <p>
                  &ldquo;Good condition, quick sale.&rdquo; No weight band, no layup, no
                  hull weight, no word on the repair under the bow ball. You find that
                  out on collection day, with a trailer.
                </p>
              </li>
              <li>
                <span className="pin" aria-hidden="true" />
                <h3>Paying is the frightening part</h3>
                <p>
                  A stranger, a five-figure transfer, and no way to know the boat
                  exists. Every rower has heard the story. Most of them simply never
                  buy second-hand again.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- The solution ---------- */}
      <section className="section on-hull" id="solution">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Our solution</p>
              <h2>One market, built to the sport&rsquo;s own spec sheet.</h2>
              <p className="lede">
                Not a classifieds site with a rowing category bolted on. A market
                whose fields, filters, verification and fees were designed around
                objects that cost as much as a car and last thirty years.
              </p>
            </div>
          </div>

          <ul className="solution-grid">
            <li>
              <h3>Listings with the real specs</h3>
              <p>
                Crew weight band, layup, hull weight, length, rigging, condition
                grade and repair history are structured fields, so you can filter on
                them and compare two boats without reading two paragraphs of prose.
              </p>
            </li>
            <li>
              <h3>Sellers who have been checked</h3>
              <p>
                A person reviews every submission before it goes live. Verified
                sellers have proven identity and ownership. Anything unverified is
                labelled as such, on the listing, plainly.
              </p>
            </li>
            <li>
              <h3>Prices you can actually see</h3>
              <p>
                Sold listings stay up for six months. For the first time the sport
                gets a public record of what boats trade for, rather than what people
                hoped to get.
              </p>
            </li>
            <li>
              <h3>An AI concierge that reads the stock</h3>
              <p>
                Tell it your weight, your budget and what you want to do on the
                water. It answers only from the live inventory, so it cannot invent a
                boat that is not there.
              </p>
            </li>
            <li>
              <h3>Everything that goes with the boat</h3>
              <p>
                Blades, riggers, trailers, cox boxes, helmets, kit. A club replacing
                a four usually needs four other things, and buying them in five
                places is how a season&rsquo;s budget disappears.
              </p>
            </li>
            <li>
              <h3>Free to list, always</h3>
              <p>
                No listing fee, no relisting fee, no &ldquo;featured&rdquo; upsell to
                be seen. A club with fifteen boats to clear pays nothing to put them
                all up.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- Money ---------- */}
      <section className="section" id="money">
        <div className="wrap money-grid">
          <div className="money-copy">
            <p className="eyebrow">The promise we will not break</p>
            <h2>We never hold your money.</h2>
            <p className="lede">
              Most marketplaces sit in the middle of the payment. They take the
              buyer&rsquo;s money, hold it for days or weeks, earn interest on the
              float, and release it to the seller when their risk team is
              comfortable. That model is why sellers wait, why disputes take a month,
              and why a marketplace going under takes its sellers&rsquo; balances with it.
            </p>
            <p>
              We are not in the payment. Buyer and seller settle directly, in
              whatever way they agree: bank transfer, in person on collection, or a
              third-party escrow the two of them choose for a boat worth escrowing.
              We invoice our commission to the seller after the sale has happened.
            </p>
            <p>
              It costs us the float and it costs us a payments business we could have
              built. It buys the one thing a new marketplace cannot otherwise get:
              you never have to trust us with a five-figure transfer to use us.
            </p>
            <p>
              <Link href="/pricing" className="link-arrow">
                See exactly what we charge
              </Link>
            </p>
          </div>

          <ul className="money-facts">
            <li>
              <span className="money-figure">{SITE.fees.currencySymbol}0</span>
              <p>
                <strong>To list.</strong> Private sellers, clubs and dealers alike.
                No fee to post, repost, or edit.
              </p>
            </li>
            <li>
              <span className="money-figure">{Math.round(SITE.fees.rate * 100)}%</span>
              <p>
                <strong>On a completed sale,</strong> invoiced to the seller, capped
                at {SITE.fees.currencySymbol}
                {SITE.fees.cap}. Nothing on a sale under {SITE.fees.currencySymbol}
                {SITE.fees.freeBelow}.
              </p>
            </li>
            <li>
              <span className="money-figure">{SITE.fees.currencySymbol}0</span>
              <p>
                <strong>Held by us, ever.</strong> No wallet, no balance, no payout
                queue, no float. Your money goes from the buyer to you.
              </p>
            </li>
            <li>
              <span className="money-figure">0</span>
              <p>
                <strong>Fees to a buyer.</strong> Buyers pay the seller the price on
                the listing. We do not add a percentage at checkout, because there is
                no checkout.
              </p>
            </li>
          </ul>
        </div>

        <div className="wrap">
          <MoneyFlow />
        </div>
      </section>

      {/* ---------- Products ---------- */}
      <section className="section on-bone-2" id="products">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">What we sell</p>
              <h2>Everything that gets a crew on the water.</h2>
              <p>
                Some of it is live today, some opens next, and some is honestly still
                a plan, labelled so you can tell which is which.
              </p>
            </div>
          </div>

          <ul className="rack">
            {PRODUCTS.map((product) => (
              <li key={product.title}>
                <div className="rack-bay">
                  <span className="rack-kicker">{product.kicker}</span>
                  <span className={`rack-status is-${product.status}`}>
                    {STATUS_LABEL[product.status]}
                  </span>
                </div>
                <div>
                  <h3>{product.title}</h3>
                  <p className="rack-body">{product.body}</p>
                </div>
                <ul className="ticklist">
                  {product.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <p className="rack-cta">
                  <Link href={product.href} className="link-arrow">
                    {product.cta}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">How it works</p>
              <h2>Four steps each way, and no step where we hold anything.</h2>
            </div>
          </div>

          <div className="how-columns">
            <div>
              <h3 className="how-column-title">Buying</h3>
              <ol className="how-steps">
                <li>
                  <span className="how-step-number">1</span>
                  <div>
                    <h4>Filter on what matters</h4>
                    <p>
                      Class, crew weight band, layup, price, location. Or describe
                      yourself to the concierge and let it read the stock for you.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="how-step-number">2</span>
                  <div>
                    <h4>Read the full spec</h4>
                    <p>
                      Hull weight, rigging, repair history and honest photographs of
                      the damage, not just the good side.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="how-step-number">3</span>
                  <div>
                    <h4>Talk to the seller directly</h4>
                    <p>
                      No bidding theatre, no countdown. Ask your questions, go and
                      see it, agree a price between you.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="how-step-number">4</span>
                  <div>
                    <h4>Pay the seller, not us</h4>
                    <p>
                      However the two of you agree. We are not in the transaction and
                      we charge the buyer nothing.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="how-column-title">Selling</h3>
              <ol className="how-steps">
                <li>
                  <span className="how-step-number">1</span>
                  <div>
                    <h4>List it in ten minutes, free</h4>
                    <p>
                      The form asks for the specs a buyer filters on, and tells you
                      exactly which photographs to take.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="how-step-number">2</span>
                  <div>
                    <h4>We check it, then it goes live</h4>
                    <p>
                      A person reviews it. Verification is what makes a stranger
                      willing to drive four hours with a trailer.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="how-step-number">3</span>
                  <div>
                    <h4>Buyers come to you</h4>
                    <p>
                      Enquiries land in your inbox. You answer them, you decide who
                      gets it, you set the terms.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="how-step-number">4</span>
                  <div>
                    <h4>You get paid, then we invoice</h4>
                    <p>
                      The money reaches you first. Our {Math.round(SITE.fees.rate * 100)}%
                      is invoiced afterwards, and nothing if it never sold.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Why this works ---------- */}
      <section className="section on-hull" id="why">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Why this works</p>
              <h2>A small sport is not a small opportunity. It is a defensible one.</h2>
            </div>
          </div>

          <ol className="why-list">
            <li>
              <span className="why-figure" aria-hidden="true">
                01
              </span>
              <div>
              <h3>The market is small enough that nobody bothered</h3>
              <p>
                Rowing is too niche for eBay to build fields for and too specialised
                for a general classifieds site to serve. That gap has stayed open for
                twenty years of the internet. Being the only credible answer in a
                narrow market beats being the fortieth in a broad one.
              </p>
              </div>
            </li>
            <li>
              <span className="why-figure" aria-hidden="true">
                02
              </span>
              <div>
              <h3>Liquidity compounds, and it compounds here first</h3>
              <p>
                Sellers list where the buyers are; buyers look where the boats are.
                Whoever gets the first few hundred real listings in a region owns
                that region, because the second marketplace has nothing to show.
                That is what the waiting list is for.
              </p>
              </div>
            </li>
            <li>
              <span className="why-figure" aria-hidden="true">
                03
              </span>
              <div>
              <h3>The transaction is high value and low frequency</h3>
              <p>
                Nobody buys an eight twice a year, so we do not need habit or
                addiction mechanics. We need to be the place you remember and trust
                the one time a decade you need it, which rewards being honest far
                more than being sticky.
              </p>
              </div>
            </li>
            <li>
              <span className="why-figure" aria-hidden="true">
                04
              </span>
              <div>
              <h3>Not holding the money is a moat, not a compromise</h3>
              <p>
                It removes our biggest cost, our biggest regulatory burden and the
                single largest reason a person will not use a marketplace they have
                not heard of. An incumbent built on float cannot copy it without
                giving up its revenue.
              </p>
              </div>
            </li>
            <li>
              <span className="why-figure" aria-hidden="true">
                05
              </span>
              <div>
              <h3>Clubs are the wedge</h3>
              <p>
                Every club has boats to sell, boats to buy, a fleet to kit out and a
                committee that talks to other clubs. Win one club and you get its
                fleet, its members, and its region&rsquo;s regatta circuit.
              </p>
              </div>
            </li>
            <li>
              <span className="why-figure" aria-hidden="true">
                06
              </span>
              <div>
              <h3>Where it goes after boats</h3>
              <p>
                Rentals turn the same listings into revenue for the months a hull sits
                still. Own-brand blades, kit and helmets add a second margin on top of
                a market we already own. Then the same machinery for kayaks, canoes
                and dinghies. Every boat, exactly as the name says.
              </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ---------- Live inventory ---------- */}
      <section className="section" id="live">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Live now</p>
              <h2>This is not a mock-up. The market is already running.</h2>
              <p>
                {facets.total} listings, {facets.manufacturers.length} manufacturers,{" "}
                {facets.continents.length} continents. You can browse, filter and
                enquire today. The waiting list is for the regions and the products
                we have not opened yet.
              </p>
              {aggregated > 0 && (
                <p className="live-note small">
                  <span className="live-dot" aria-hidden="true" />
                  {aggregated} of these {aggregated === 1 ? "comes" : "come"} from
                  live feeds and refresh on their own
                  {synced ? `, last checked ${relativeSync(synced)}` : ""}. A boat
                  that leaves its source is marked sold here rather than quietly
                  vanishing, so the price history stays readable.
                </p>
              )}
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

          <ul className="browse-grid mt-6">
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

      {/* ---------- Concierge ---------- */}
      <section className="section on-bone-2 concierge-band">
        <div className="wrap concierge-band-grid">
          <div>
            <p className="eyebrow">AI Concierge</p>
            <h2>&ldquo;I&rsquo;m 71 kg, rowed for three years, and I have €9,000.&rdquo;</h2>
            <p className="lede">
              Tell the concierge what you weigh, what you can spend and what you want
              to do on the water. It reads the live inventory before it answers, so
              every boat it recommends is one you can go and buy today, with the
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

      {/* ---------- Waiting list ---------- */}
      <section className="section waitlist-section" id="waitlist">
        <div className="wrap waitlist-grid">
          <div>
            <p className="eyebrow">Join the waiting list</p>
            <h2>Get in before your region opens.</h2>
            <p className="lede">
              We open region by region, and the list decides the order. Tell us where
              you row and what you need, and you will hear from us when there is
              something real to see where you are, and not before.
            </p>
            <ul className="ticklist mt-5">
              <li>First access when your region opens</li>
              <li>Free listing for everything you put up in the first season</li>
              <li>A say in what gets built, because we read every note</li>
              <li>One email at signup, then nothing until it matters</li>
            </ul>
            {waiting.showCount && (
              <p className="muted mt-5">
                <strong>{waiting.count}</strong> people are already waiting
                {waiting.countries > 1 ? `, across ${waiting.countries} countries` : ""}.
              </p>
            )}
          </div>

          <WaitlistForm variant="full" id="waitlist-form" />
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section" id="faq">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Questions</p>
              <h2>The things people ask before they trust a new marketplace.</h2>
            </div>
          </div>

          <div className="faq-list">
            {FAQS.map((item) => (
              <details key={item.q}>
                <summary>
                  <h3>{item.q}</h3>
                </summary>
                <div className="faq-body">{item.a}</div>
              </details>
            ))}
          </div>

          <p className="mt-6">
            <Link href="/contact" className="link-arrow">
              Ask us something else
            </Link>
          </p>
        </div>
      </section>

      {/* ---------- Closing ---------- */}
      <section className="section-tight">
        <div className="wrap">
          <div className="sell-cta">
            <div>
              <p className="eyebrow">Selling already</p>
              <h2>Got a boat in the rack you no longer row?</h2>
              <p className="muted">
                Listing is free and open now. We charge{" "}
                {Math.round(SITE.fees.rate * 100)}% when it sells, capped at{" "}
                {SITE.fees.currencySymbol}
                {SITE.fees.cap}, nothing under {SITE.fees.currencySymbol}
                {SITE.fees.freeBelow}, and nothing at all if it does not sell.
              </p>
            </div>
            <div className="cluster">
              <Link href="/sell" className="btn btn-lg">
                List a boat
              </Link>
              <Link href="#waitlist" className="btn btn-ghost btn-lg">
                Join the waiting list
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
