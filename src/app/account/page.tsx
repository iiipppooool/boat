import type { Metadata } from "next";
import Link from "next/link";
import { BillingActions } from "@/components/BillingActions";
import { redirect } from "next/navigation";
import { isSubscribed } from "@/lib/accounts";
import { getSessionAccount } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { getListingsBySeller } from "@/lib/inventory";
import { formatPrice } from "@/lib/fx";
import { formatDate, relativeDate } from "@/lib/format";
import { CAP_BITES_ABOVE, FREE_BELOW, formatFee, rateLabel } from "@/lib/fees";
import { getPaymentsProvider } from "@/lib/payments/provider";
import { SITE } from "@/lib/site";

/**
 * Reads the account's own listings and live subscription state, either of which
 * may have changed a second ago.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  description: "Manage your BoatXchange listings, subscription and invoices.",
};

/**
 * Account and billing.
 *
 * Subscription state here is real: it comes from the accounts table, which only
 * the Stripe webhook writes to. So is *who you are*: the page resolves the
 * session set at sign-in and sends anyone without one to /login.
 *
 * The listings table belongs to a seed seller so it has rows to show before any
 * real listing exists.
 */
const DEMO_SELLER_NAME = "Ruhr Rowing Supply";

export default async function AccountPage() {
  const account = await getSessionAccount();
  if (!account) redirect("/login");

  const subscribed = isSubscribed(account);
  const payments = getPaymentsProvider();
  const listings = getListingsBySeller(DEMO_SELLER_NAME);
  const live = listings.filter((l) => l.status === "available").length;

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <p className="eyebrow">Account</p>
          <div className="page-head-grid">
            <h1>{account.name}</h1>
            <p className="lede">
              {account.email} · <SignOutButton />
            </p>
          </div>
        </div>
      </div>

      <div className="wrap section-tight">
        <p className="notice mb-6">
          <strong>Signed in as {account.email}.</strong> Subscription state below is
          real (it is written only by the Stripe webhook), and the listings table is
          read live from the same inventory the market runs on. The table currently
          shows a seed seller&rsquo;s stock so there is something to look at before
          your first listing.
        </p>

        <div className="account-grid">
          <section className="panel" aria-labelledby="subscription">
            <h2 id="subscription" className="account-h2">Subscription</h2>
            <p className="account-plan">
              {subscribed ? "Boathouse" : "Crew"}
              {subscribed ? (
                <span className="pill pill-verified">Active</span>
              ) : (
                <span className="pill">Free</span>
              )}
            </p>

            <dl className="spec-table-dl mt-4">
              <div>
                <dt>Commission</dt>
                <dd>{subscribed ? "0%, included" : rateLabel()}</dd>
              </div>
              {!subscribed && (
                <>
                  <div>
                    <dt>Nothing to pay below</dt>
                    <dd>{formatFee(FREE_BELOW)}</dd>
                  </div>
                  <div>
                    <dt>Capped at</dt>
                    <dd>
                      {formatFee(SITE.fees.cap)}
                      {Number.isFinite(CAP_BITES_ABOVE) && (
                        <span className="muted"> above {formatFee(CAP_BITES_ABOVE)}</span>
                      )}
                    </dd>
                  </div>
                </>
              )}
              {account.subscriptionStatus && (
                <div>
                  <dt>Stripe status</dt>
                  <dd>{account.subscriptionStatus}</dd>
                </div>
              )}
              {account.currentPeriodEnd && (
                <div>
                  <dt>Renews</dt>
                  <dd>{formatDate(account.currentPeriodEnd)}</dd>
                </div>
              )}
            </dl>

            {payments.enabled ? (
              <BillingActions
                subscribed={subscribed}
                hasBillingHistory={Boolean(account.stripeCustomerId)}
              />
            ) : (
              <p className="notice mt-5">
                <strong>Billing is not configured.</strong> Set{" "}
                <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_BOATHOUSE_PRICE_ID</code>{" "}
                to enable subscriptions and commission invoices. See{" "}
                <code>.env.example</code>.
              </p>
            )}
          </section>

          <section className="panel" aria-labelledby="payment">
            <h2 id="payment" className="account-h2">Payment method</h2>
            {account.stripeCustomerId ? (
              <>
                <p className="small muted">
                  Cards, billing address and invoice history are held by Stripe and
                  managed in its hosted portal. No card details ever reach this
                  application, we store a customer reference and nothing else.
                </p>
                <dl className="spec-table-dl mt-4">
                  <div>
                    <dt>Stripe customer</dt>
                    <dd className="tiny">{account.stripeCustomerId}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="small muted">
                Nothing on file. A payment method is collected the first time you
                subscribe or are invoiced, through Stripe&rsquo;s own checkout, never
                through a form here.
              </p>
            )}
          </section>

          <section className="panel" aria-labelledby="summary">
            <h2 id="summary" className="account-h2">Your listings</h2>
            <dl className="spec-table-dl">
              <div>
                <dt>Live</dt>
                <dd>{live}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{listings.length}</dd>
              </div>
              <div>
                <dt>Commission paid</dt>
                <dd>{formatFee(0)}</dd>
              </div>
            </dl>
            <p className="small muted mt-4">
              Commission is invoiced after a sale completes and you confirm the price
              it went for. Nothing is charged on a listing that does not sell.
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
          <p className="panel muted small">
            Invoices are issued and stored by Stripe.{" "}
            {account.stripeCustomerId
              ? "Open the billing portal above to view, download or pay them."
              : "There is no billing history on this account yet."}
          </p>
        </section>
      </div>
    </>
  );
}
