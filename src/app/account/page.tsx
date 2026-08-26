import type { Metadata } from "next";
import Link from "next/link";
import { getListingsBySeller } from "@/lib/inventory";
import { formatPrice } from "@/lib/fx";
import { formatDate, relativeDate } from "@/lib/format";

/**
 * Reads the signed-in seller's own listings, which they may have just edited —
 * a cached copy showing a boat as available after they marked it sold would be
 * worse than a slightly slower page.
 */
export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Your account",
  description: "Manage your BoatXchange listings, subscription, payment method and invoices.",
};

/**
 * Account and billing.
 *
 * v1 stub: there is no authentication behind this yet, so the page renders a
 * fixed demo account rather than a signed-in session. Everything except the
 * identity is real — the listings table comes out of the live inventory via the
 * same repository the Market page uses, so a boat marked sold changes here too.
 *
 * Wiring this to real auth means replacing DEMO_ACCOUNT with the session's
 * seller record and gating the route; the markup below does not change.
 */
const DEMO_ACCOUNT = {
  name: "Ruhr Rowing Supply",
  contact: "Katrin Mahler",
  email: "katrin@ruhrrowing.de",
  tier: "Boathouse",
  status: "active" as const,
  renewsOn: "2027-02-14",
  billedAnnually: true,
  amount: "£790.00",
  card: { brand: "Visa", last4: "4291", expiry: "07/29" },
};

const INVOICES = [
  { id: "BX-2026-0412", date: "2026-02-14", description: "Boathouse — annual subscription", amount: "£790.00", status: "Paid" },
  { id: "BX-2025-3877", date: "2025-02-14", description: "Boathouse — annual subscription", amount: "£790.00", status: "Paid" },
  { id: "BX-2024-2910", date: "2024-11-03", description: "Sale commission — 2019 Empacher double (bx-0881)", amount: "£600.00", status: "Paid" },
  { id: "BX-2024-2661", date: "2024-09-19", description: "Sale commission — Croker sculls, set of four (bx-0774)", amount: "£96.40", status: "Paid" },
];

export default function AccountPage() {
  const listings = getListingsBySeller(DEMO_ACCOUNT.name);
  const live = listings.filter((l) => l.status === "available").length;

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <p className="eyebrow">Account</p>
          <div className="page-head-grid">
            <h1>{DEMO_ACCOUNT.name}</h1>
            <p className="lede">
              Signed in as {DEMO_ACCOUNT.contact} · {DEMO_ACCOUNT.email} ·{" "}
              <Link href="/login">not you?</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="wrap section-tight">
        <p className="notice mb-6">
          <strong>Demonstration account.</strong> Authentication is not wired up in
          this build, so you are looking at a fixed example account. The listings
          table below is real — it is read live from the same inventory the market
          runs on.
        </p>

        <div className="account-grid">
          <section className="panel" aria-labelledby="subscription">
            <h2 id="subscription" className="account-h2">Subscription</h2>
            <p className="account-plan">
              {DEMO_ACCOUNT.tier}
              <span className="pill pill-verified">Active</span>
            </p>
            <dl className="spec-table-dl mt-4">
              <div>
                <dt>Billing</dt>
                <dd>{DEMO_ACCOUNT.billedAnnually ? "Annual" : "Monthly"}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{DEMO_ACCOUNT.amount}</dd>
              </div>
              <div>
                <dt>Renews</dt>
                <dd>{formatDate(DEMO_ACCOUNT.renewsOn)}</dd>
              </div>
              <div>
                <dt>Commission rate</dt>
                <dd>0% — included</dd>
              </div>
            </dl>
            <div className="cluster mt-5">
              <Link href="/pricing" className="btn btn-ghost btn-sm">Change plan</Link>
              <button type="button" className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </section>

          <section className="panel" aria-labelledby="payment">
            <h2 id="payment" className="account-h2">Payment method</h2>
            <div className="card-on-file">
              <span className="card-brand">{DEMO_ACCOUNT.card.brand}</span>
              <span className="card-number">
                •••• •••• •••• {DEMO_ACCOUNT.card.last4}
              </span>
              <span className="small muted">Expires {DEMO_ACCOUNT.card.expiry}</span>
            </div>
            <p className="small muted mt-4">
              Charged in pounds sterling. We never see or store your card number —
              it sits with the payment processor and we hold a token.
            </p>
            <div className="cluster mt-5">
              <button type="button" className="btn btn-ghost btn-sm">Update card</button>
              <button type="button" className="btn btn-ghost btn-sm">Billing address</button>
            </div>
          </section>

          <section className="panel" aria-labelledby="summary">
            <h2 id="summary" className="account-h2">This year</h2>
            <dl className="spec-table-dl">
              <div>
                <dt>Live listings</dt>
                <dd>{live}</dd>
              </div>
              <div>
                <dt>Listings total</dt>
                <dd>{listings.length}</dd>
              </div>
              <div>
                <dt>Enquiries received</dt>
                <dd>47</dd>
              </div>
              <div>
                <dt>Median time to sell</dt>
                <dd>38 days</dd>
              </div>
              <div>
                <dt>Commission paid</dt>
                <dd>£0.00</dd>
              </div>
            </dl>
            <p className="small muted mt-4">
              On the Single tier those sales would have cost £1,284 in commission.
            </p>
          </section>
        </div>

        <section className="account-section" aria-labelledby="listings">
          <div className="section-head">
            <div>
              <p className="eyebrow">Your listings</p>
              <h2 id="listings">What you have on the market</h2>
            </div>
            <Link href="/sell" className="btn btn-accent btn-sm">Add a listing</Link>
          </div>

          {listings.length === 0 ? (
            <p className="panel muted">
              Nothing listed yet. <Link href="/sell">List your first boat</Link>.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="spec-table account-table">
                <thead>
                  <tr>
                    <th scope="col">Listing</th>
                    <th scope="col">Price</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                    <th scope="col"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id}>
                      <th scope="row">
                        <Link href={`/market/${l.slug}`}>{l.title}</Link>
                        <span className="tiny muted"> {l.id}</span>
                      </th>
                      <td>{formatPrice(l.price, l.currency)}</td>
                      <td>
                        <span
                          className={`pill ${
                            l.status === "available"
                              ? "pill-verified"
                              : l.status === "pending"
                                ? "pill-pending"
                                : "pill-sold"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="nowrap">{relativeDate(l.updatedAt)}</td>
                      <td className="nowrap">
                        <button type="button" className="link-button">Edit</button>
                        <span aria-hidden="true"> · </span>
                        <button type="button" className="link-button">Mark sold</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="account-section" id="invoices" aria-labelledby="invoices-heading">
          <div className="section-head">
            <div>
              <p className="eyebrow">Billing</p>
              <h2 id="invoices-heading">Invoices</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table className="spec-table account-table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((invoice) => (
                  <tr key={invoice.id}>
                    <th scope="row">
                      <button type="button" className="link-button">{invoice.id}</button>
                    </th>
                    <td className="nowrap">{formatDate(invoice.date)}</td>
                    <td>{invoice.description}</td>
                    <td className="nowrap">{invoice.amount}</td>
                    <td>
                      <span className="pill pill-verified">{invoice.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted mt-4">
            Commission invoices are raised at the end of the month in which a sale
            completes.
          </p>
        </section>
      </div>
    </>
  );
}
