import Link from "next/link";
import { HullArt } from "@/components/HullArt";

export default function NotFound() {
  return (
    <div className="wrap section notfound">
      <div className="notfound-art" aria-hidden="true">
        <HullArt seed={404} scene="puddles" ratio={0.72} />
      </div>
      <div>
        <p className="eyebrow">404</p>
        <h1>Nothing at this mooring.</h1>
        <p className="lede">
          The page has moved, the listing has been taken down, or the link was wrong
          to begin with. Boats that have sold stay up for six months, so if you
          followed a link to one and it has vanished, it has been gone a while.
        </p>
        <div className="cluster mt-6">
          <Link href="/market" className="btn">Browse the market</Link>
          <Link href="/concierge" className="btn btn-ghost">Ask the concierge</Link>
          <Link href="/" className="btn btn-ghost">Back to the start</Link>
        </div>
      </div>
    </div>
  );
}
