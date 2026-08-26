import type { Metadata } from "next";
import Link from "next/link";
import { HullArt } from "@/components/HullArt";
import { getFacets } from "@/lib/inventory";

// Reads live market totals, so it must not be frozen at build time.
export const revalidate = 300;


export const metadata: Metadata = {
  title: "How it works",
  description:
    "Why rowing needed its own marketplace, how BoatXchange verifies listings and sellers, and how the AI Concierge is kept honest.",
};

const BUYER_STEPS = [
  {
    title: "Search on the specs that decide it",
    body: "Crew weight band, class, layup, rigging, region. Not colour, not vibes. The filters exist because these are the fields that determine whether a boat will work for you, and a general classifieds site does not have them.",
  },
  {
    title: "Read a listing that tells you the truth",
    body: "Every boat carries its repair history, its storage history and its honest condition grade. We push sellers hard on this, because a listing that hides a repair produces a wasted six-hour drive and a buyer who never comes back.",
  },
  {
    title: "Talk to the seller directly",
    body: "We introduce; we do not intermediate. You agree the price, the inspection and the handover between yourselves — the way boats have always changed hands, just with a bigger pool of them.",
  },
];

const SELLER_STEPS = [
  {
    title: "List it in about ten minutes",
    body: "Free, with no listing fee and no relisting fee. Have the builder's spec sheet to hand for the weight band and the layup and it goes quickly.",
  },
  {
    title: "We verify before it goes live",
    body: "Identity and ownership, checked by a person. It usually takes a working day. Unverified listings can still go up — they are labelled as unverified, plainly, and they get less attention, which is the point.",
  },
  {
    title: "Pay only when it sells",
    body: "4% capped at £600, or nothing at all on the Boathouse tier. If the boat does not sell, you owe nothing and the listing stays up.",
  },
];

export default function AboutPage() {
  const facets = getFacets();

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <p className="eyebrow">About</p>
          <div className="page-head-grid">
            <h1>Built for a sport that had nowhere to sell its boats.</h1>
            <p className="lede">
              BoatXchange exists because a racing eight costs as much as a car and
              was being sold like a second-hand sofa.
            </p>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="wrap about-lead">
          <div className="about-lead-art" aria-hidden="true">
            <HullArt seed={311} scene="boathouse" ratio={1.05} />
          </div>
          <div className="prose about-prose">
            <p className="about-standfirst">
              Every other kind of boat has a market. Sailing has YachtWorld. Motor
              boats have Boats.com. Rowing — a sport with a quarter of a million
              registered athletes and fleets worth millions sitting in boathouses —
              has a club noticeboard, a regional Facebook group, and word of mouth.
            </p>
            <p>
              The consequence is not just inconvenience. It is that boats are
              mispriced in both directions, that clubs replace hulls they could have
              sold, that a sculler in Ohio never hears about the right boat in
              Vancouver, and that the second-hand market — the thing that actually
              makes an expensive sport affordable to enter — barely functions.
            </p>
            <p>
              We started this after spending four months trying to sell a club double
              and eventually giving it to a neighbouring club for nothing, because
              there was no way to reach anyone who wanted it. That is a bad outcome
              for a boat worth eight thousand euros, and it happens constantly.
            </p>
            <p>
              BoatXchange is deliberately narrow. It only does rowing boats, oars,
              riggers and trailers. That narrowness is the product: it is why the
              filters have a crew weight band, why listings ask about layup, and why
              the concierge knows that recommending a race hull to a beginner is how
              people end up swimming and then quitting.
            </p>
            <p className="muted small">
              Today the market carries {facets.total} listings across{" "}
              {facets.manufacturers.length} manufacturers and{" "}
              {facets.continents.length} continents.
            </p>
          </div>
        </div>
      </section>

      <section className="section-tight on-bone-2" style={{ borderBlock: "1px solid var(--line)" }}>
        <div className="wrap">
          <div className="how-grid">
            <div>
              <p className="eyebrow">For buyers</p>
              <ol className="how-steps">
                {BUYER_STEPS.map((step, i) => (
                  <li key={step.title}>
                    <span className="how-step-number">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="eyebrow">For sellers</p>
              <ol className="how-steps">
                {SELLER_STEPS.map((step, i) => (
                  <li key={step.title}>
                    <span className="how-step-number">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="verification">
        <div className="wrap wrap-faq">
          <p className="eyebrow">Trust</p>
          <h2>How listings get verified</h2>
          <div className="prose mt-5">
            <p>
              A verified badge on BoatXchange means two specific things, checked by a
              person, not inferred by software:
            </p>
            <ol>
              <li>
                <strong>The seller is who they say they are.</strong> For a private
                seller, government ID matched against the account name. For a club,
                a named officer confirmed against the club&rsquo;s own published
                contacts. For a dealer, company registration.
              </li>
              <li>
                <strong>The seller owns the boat.</strong> Original invoice, a
                builder&rsquo;s certificate, or club minutes authorising the sale.
                Where none of those exist — and for a 2004 club four they often do
                not — a photograph of the hull identification number alongside a
                dated note, plus a reference from the club it has been rowed at.
              </li>
            </ol>
            <p>
              What the badge does <em>not</em> mean: that we have inspected the boat,
              surveyed the hull, or verified the condition grade. We have not seen it.
              Nobody should buy a five-figure boat without inspecting it or sending
              someone who knows what a soft spot feels like.
            </p>
            <p>
              Listings from unverified sellers stay on the site and say so on the
              listing itself. Hiding them would push those sales back into the group
              chats, which helps nobody. Labelling them lets buyers price the risk.
            </p>
            <h3>What we do about bad listings</h3>
            <p>
              A listing that misstates a repair, a weight band or a hull&rsquo;s
              history comes down, and the seller loses their badge permanently. There
              is no appeals process and no second chance, because in a market this
              small a reputation for tolerating that would be fatal within a season.
            </p>
          </div>
        </div>
      </section>

      <section className="section on-hull" id="concierge">
        <div className="wrap wrap-faq">
          <p className="eyebrow">The concierge</p>
          <h2>How the AI is kept honest</h2>
          <div className="prose mt-5">
            <p>
              The concierge is useful only if it never invents a boat. A recommendation
              you cannot click is worse than no recommendation, and one confidently
              described boat that does not exist would cost more trust than the feature
              is worth.
            </p>
            <p>So the architecture puts the model last, not first:</p>
            <ol>
              <li>
                Your message is read for constraints — weight, budget, class, region —
                by ordinary code, not by a model.
              </li>
              <li>
                Those become a database query against the live inventory. The same
                query the Market page runs.
              </li>
              <li>
                The model receives the results and nothing else. It is instructed that
                the shortlist is the complete set of boats it may recommend.
              </li>
              <li>
                Reference codes in the answer are matched back against that shortlist
                before they become links. An id the retrieval step never supplied is
                stripped rather than rendered.
              </li>
            </ol>
            <p>
              We also use a small, cheap model on purpose. By the time it is called,
              the hard work is done — the remaining task is reading a dozen structured
              records and explaining a trade-off in plain English, which does not need
              a frontier model. Cheap inference is what lets the concierge stay free
              and unmetered for buyers.
            </p>
            <p>
              It is an assistant, not a surveyor. It has read the listing. It has not
              seen the boat.
            </p>
            <p className="mt-5">
              <Link href="/concierge" className="link-arrow">
                Try it
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap">
          <div className="sell-cta">
            <div>
              <p className="eyebrow">Get in touch</p>
              <h2>Questions, corrections, or a fleet to move?</h2>
              <p className="muted">
                We read everything. If something on this site is wrong, tell us and we
                will fix it.
              </p>
            </div>
            <div className="cluster">
              <Link href="/contact" className="btn btn-lg">Contact us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
