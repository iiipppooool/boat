import type { Metadata } from "next";
import Link from "next/link";
import { ConciergeChat } from "@/components/ConciergeChat";
import { getConciergeProvider } from "@/lib/ai/provider";
import { getFacets, getListingBySlug } from "@/lib/inventory";

export const metadata: Metadata = {
  title: "AI Concierge",
  description:
    "Describe your weight, budget, experience and what you want to do on the water. The BoatXchange concierge reads the live inventory and recommends specific boats, with reasons.",
};

export default async function ConciergePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slugParam = typeof params.listing === "string" ? params.listing : undefined;
  const pinned = slugParam ? getListingBySlug(slugParam) : null;
  const facets = getFacets();
  const provider = getConciergeProvider();

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <p className="eyebrow">AI Concierge</p>
          <div className="page-head-grid">
            <h1>Buying a boat is a sizing problem before it&rsquo;s a shopping problem.</h1>
            <p className="lede">
              Most people looking for their first single do not know that hulls are
              built to a weight band, or that the boat they have been admiring is
              built for someone eight kilos heavier. Say what you weigh, what you can
              spend and what you want to do. The concierge does the rest against{" "}
              {facets.availableTotal} live listings.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap concierge-layout section-tight">
        <div>
          {pinned && (
            <p className="notice mb-6">
              <strong>Asking about {pinned.title}.</strong> The concierge has this
              listing in front of it and will compare it against the rest of the
              inventory. <Link href="/concierge">Start a general conversation instead</Link>.
            </p>
          )}
          <ConciergeChat pinnedSlug={pinned?.slug} pinnedTitle={pinned?.title} />
        </div>

        <aside className="concierge-aside">
          <div className="panel panel-quiet">
            <h2 className="concierge-aside-title">How this works</h2>
            <ol className="numbered-list">
              <li>
                <strong>Your words become a query.</strong> Weight, budget, class and
                region are pulled out of what you type and run against the same
                database the Market page uses.
              </li>
              <li>
                <strong>Real listings go to the model.</strong> It receives a shortlist
                of boats that are for sale right now, with their real specs and prices.
              </li>
              <li>
                <strong>It can only recommend from that shortlist.</strong> Boats it
                names are turned into links from the inventory, so a recommendation
                you cannot click is a recommendation it cannot make.
              </li>
            </ol>
            <p className="small muted mt-4">
              It is an assistant, not a surveyor. It has read the listing; it has not
              seen the boat. Inspect anything you are serious about.
            </p>
          </div>

          <div className="panel panel-quiet mt-5">
            <h2 className="concierge-aside-title">Under the hood</h2>
            <dl className="spec-table-dl">
              <div>
                <dt>Model</dt>
                <dd>{provider.live ? provider.model : "not configured"}</dd>
              </div>
              <div>
                <dt>Grounding</dt>
                <dd>Live inventory, retrieved per turn</dd>
              </div>
              <div>
                <dt>Cost per exchange</dt>
                <dd>≈ US$0.005</dd>
              </div>
            </dl>
            <p className="small muted mt-4">
              A small, cheap model is the right tool here: retrieval has already found
              the boats, so what is left is reading a dozen records and explaining a
              trade-off. Paying frontier-model prices for that would not make the
              advice better.
            </p>
          </div>

          <p className="small mt-5">
            <Link href="/market" className="link-arrow">
              Or browse the market yourself
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}
