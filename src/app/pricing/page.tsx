import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free to browse, free to list. BoatXchange charges 4% when a boat sells, capped at £600 — or a flat subscription for dealers and clubs moving fleets.",
};

const TIERS = [
  {
    id: "crew",
    name: "Crew",
    price: "Free",
    cadence: "always",
    who: "Buyers, and anyone selling one boat",
    cta: { href: "/market", label: "Browse the market" },
    features: [
      "Browse and filter every listing",
      "Full spec sheets and seller history",
      "Unlimited use of the AI Concierge",
      "Saved searches and price alerts",
      "Contact any seller directly",
    ],
    note: "Buyers never pay BoatXchange anything. The fee sits on the sell side, where the money is.",
  },
  {
    id: "single",
    name: "Single",
    price: "4%",
    cadence: "on sale, capped at £600",
    who: "Private sellers and clubs selling occasionally",
    featured: true,
    cta: { href: "/sell", label: "List a boat" },
    features: [
      "Free to list — pay only when it sells",
      "No fee at all if the boat does not sell",
      "Listing verification and a verified badge",
      "Included in AI Concierge recommendations",
      "Listing stays visible for six months after sale",
      "Photography and listing-copy guidance",
    ],
    note: "The cap matters: 4% of a £45,000 eight would be £1,800, which is not a fee, it is a disincentive. It is £600.",
  },
  {
    id: "boathouse",
    name: "Boathouse",
    price: "£79",
    cadence: "per month, or £790 a year",
    who: "Dealers, brokers and clubs turning over fleets",
    cta: { href: "/contact", label: "Talk to us" },
    features: [
      "Unlimited listings, no commission at all",
      "A dealer page with your own branding",
      "Bulk upload by CSV, or a feed we pull",
      "Priority placement in search and concierge results",
      "Sales analytics: views, enquiries, time to sell",
      "A named contact, and support within four hours",
    ],
    note: "Breaks even at roughly two boats a year. Every dealer we have spoken to sells more than that in a month.",
  },
];

const FAQS = [
  {
    q: "When exactly do I pay the commission?",
    a: "After the sale completes and you confirm it in your account. We invoice at the end of that month, payable in thirty days. We do not hold the buyer's money, take a deposit, or act as escrow — the transaction is between you and the buyer.",
  },
  {
    q: "What if the boat sells to someone I already knew?",
    a: "Then no fee is due, and you mark it as sold off-platform. We are not going to police that, and a marketplace that tries to is one people route around. The fee is for the introduction; no introduction, no fee.",
  },
  {
    q: "Is there a listing fee, a relisting fee, or a fee to edit?",
    a: "No, no and no. Listing is free, editing is free, relisting after a failed sale is free, and there is no fee to take a listing down.",
  },
  {
    q: "What currency am I charged in?",
    a: "Pounds sterling, whatever currency the boat was listed in. The cap is £600 or the equivalent at the sale-day rate, whichever is lower.",
  },
  {
    q: "Do you take a cut of oars, trailers and parts?",
    a: "The same 4% applies, but with a £75 floor on the fee below which we do not bother invoicing. In practice a £620 pair of second-hand sculls costs you nothing.",
  },
  {
    q: "Can I cancel Boathouse?",
    a: "Any time, from your account, effective at the end of the billing period. Annual plans are refunded pro rata. Your listings stay live to the end of the period and then revert to the Single tier rather than disappearing.",
  },
];

export default function PricingPage() {
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <p className="eyebrow">Pricing</p>
          <div className="page-head-grid">
            <h1>Free to browse. Free to list. A fee only when a boat sells.</h1>
            <p className="lede">
              Rowing is a small sport with tight club budgets. A marketplace that
              charged up front would be empty, and an empty marketplace is worth
              nothing to anybody.
            </p>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="wrap">
          <ul className="tier-grid">
            {TIERS.map((tier) => (
              <li
                key={tier.id}
                id={tier.id}
                className={`tier${tier.featured ? " tier-featured" : ""}`}
              >
                {tier.featured && <p className="tier-flag">Most sellers</p>}
                <h2 className="tier-name">{tier.name}</h2>
                <p className="tier-who">{tier.who}</p>
                <p className="tier-price">
                  <span>{tier.price}</span>
                  <span className="tier-cadence">{tier.cadence}</span>
                </p>
                <ul className="tier-features">
                  {tier.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="tier-note small muted">{tier.note}</p>
                <Link
                  href={tier.cta.href}
                  className={`btn btn-block ${tier.featured ? "btn-accent" : "btn-ghost"}`}
                >
                  {tier.cta.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-tight on-bone-2" style={{ borderBlock: "1px solid var(--line)" }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Worked examples</p>
              <h2>What you would actually pay</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table className="spec-table worked-table">
              <thead>
                <tr>
                  <th scope="col">If you sell</th>
                  <th scope="col">For</th>
                  <th scope="col">Single tier fee</th>
                  <th scope="col">On Boathouse</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">A used pair of sculls</th>
                  <td>£500</td>
                  <td>Nothing — below the £75 floor</td>
                  <td>Nothing</td>
                </tr>
                <tr>
                  <th scope="row">A club single</th>
                  <td>£5,000</td>
                  <td>£200</td>
                  <td>Nothing</td>
                </tr>
                <tr>
                  <th scope="row">A racing double</th>
                  <td>£12,000</td>
                  <td>£480</td>
                  <td>Nothing</td>
                </tr>
                <tr>
                  <th scope="row">An eight</th>
                  <td>£38,000</td>
                  <td>£600 — the cap</td>
                  <td>Nothing</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small muted mt-4">
            Boathouse costs £790 a year regardless of how much you sell, which is why
            the right-hand column reads the way it does.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap wrap-faq">
          <div className="section-head">
            <div>
              <p className="eyebrow">Questions</p>
              <h2>The awkward ones, answered</h2>
            </div>
          </div>
          <dl className="faq">
            {FAQS.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6">
            <Link href="/contact" className="link-arrow">
              Something not covered? Ask us
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
