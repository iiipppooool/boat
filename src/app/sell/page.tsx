import type { Metadata } from "next";
import Link from "next/link";
import { SellForm } from "@/components/SellForm";

export const metadata: Metadata = {
  title: "Sell a boat",
  description:
    "List a rowing boat, set of oars, riggers or a trailer on BoatXchange. Free to list, worldwide audience, and a fee only when it sells.",
};

export default function SellPage() {
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <p className="eyebrow">Sell</p>
          <div className="page-head-grid">
            <h1>List a boat.</h1>
            <p className="lede">
              Free to list, and nothing to pay unless it sells. It takes about ten
              minutes if you have the builder&rsquo;s spec sheet to hand — and the
              listings that fill in the crew weight band and the repair history are
              the ones that sell.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap sell-layout section-tight">
        <SellForm />

        <aside className="sell-aside">
          <div className="panel panel-quiet">
            <h2 className="concierge-aside-title">What happens next</h2>
            <ol className="numbered-list">
              <li>You submit the listing. It is saved immediately as sale pending.</li>
              <li>
                We verify you own the boat — normally within one working day.{" "}
                <Link href="/about#verification">How that works</Link>.
              </li>
              <li>It goes live, appears in the market, and the concierge starts recommending it.</li>
              <li>
                A buyer contacts you directly. You agree the sale and the inspection
                between yourselves.
              </li>
              <li>
                We invoice our fee after the sale completes. If it does not sell, you
                owe nothing.
              </li>
            </ol>
          </div>

          <div className="panel panel-quiet mt-5">
            <h2 className="concierge-aside-title">Writing a listing that sells</h2>
            <ul className="tip-list">
              <li>
                <strong>Photograph the damage.</strong> Every used boat has some.
                Buyers who cannot see it assume it is worse than it is.
              </li>
              <li>
                <strong>Give the weight band.</strong> Most enquiries that go nowhere
                go nowhere because the boat was never going to fit the rower.
              </li>
              <li>
                <strong>Say what is included.</strong> Riggers, shoes, covers, bow
                ball, sculls. Ambiguity here kills deals late.
              </li>
              <li>
                <strong>Name the repairs and who did them.</strong> A documented
                professional repair barely affects value. An undocumented one halves it.
              </li>
            </ul>
          </div>

          <div className="panel panel-quiet mt-5">
            <h2 className="concierge-aside-title">Got a fleet?</h2>
            <p className="small muted">
              Clubs and dealers listing more than three boats a year are better off on
              the Boathouse tier: no commission, bulk upload, and a dealer page.
            </p>
            <Link href="/pricing#boathouse" className="link-arrow">
              Boathouse pricing
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
