/**
 * The money-flow diagram.
 *
 * The one claim on the landing page that a visitor is right to be sceptical of
 * is "we never hold your money", and a paragraph is a bad way to answer
 * scepticism about a payment path. So the page draws both paths and lets the
 * reader compare them: the top row is what every other marketplace does, the
 * bottom row is what happens here.
 *
 * Hand-built SVG rather than a chart library, there is no data here, only a
 * shape, and the shape is the argument. It inherits type and colour from the
 * page so a palette change reaches it, and every label is real text, so it can
 * be selected, translated and read aloud.
 */
export function MoneyFlow() {
  return (
    <figure className="moneyflow">
      <svg
        viewBox="0 0 880 400"
        role="img"
        aria-labelledby="moneyflow-title moneyflow-desc"
        className="moneyflow-svg"
      >
        <title id="moneyflow-title">How the money moves</title>
        <desc id="moneyflow-desc">
          On other marketplaces the buyer&rsquo;s payment goes to the marketplace,
          which holds it for days or weeks before releasing what is left to the
          seller. On BoatXchange the buyer pays the seller directly, and
          BoatXchange invoices its commission to the seller afterwards.
        </desc>

        {/* ---------------- Everywhere else ---------------- */}
        <text x="0" y="16" className="mf-rowlabel">
          EVERYWHERE ELSE
        </text>

        <g className="mf-muted">
          <rect x="0" y="40" width="150" height="60" />
          <text x="75" y="70" className="mf-node">
            Buyer
          </text>
          <text x="75" y="88" className="mf-sub">
            pays the platform
          </text>

          {/* buyer → platform */}
          <path d="M150 70 H 352" className="mf-line" markerEnd="url(#mf-arrow-muted)" />

          <rect x="365" y="26" width="180" height="88" className="mf-holder" />
          <text x="455" y="56" className="mf-node">
            The marketplace
          </text>
          <text x="455" y="76" className="mf-sub">
            holds your money
          </text>
          <text x="455" y="94" className="mf-sub mf-sub-strong">
            3 – 21 days
          </text>

          {/* platform → seller */}
          <path d="M545 70 H 727" className="mf-line" markerEnd="url(#mf-arrow-muted)" />
          <text x="636" y="52" className="mf-tag">
            minus their cut
          </text>

          <rect x="730" y="40" width="150" height="60" />
          <text x="805" y="70" className="mf-node">
            Seller
          </text>
          <text x="805" y="88" className="mf-sub">
            waits
          </text>
        </g>

        {/* ---------------- Here ---------------- */}
        <text x="0" y="196" className="mf-rowlabel mf-rowlabel-accent">
          HERE
        </text>

        <g className="mf-live">
          <rect x="0" y="220" width="150" height="60" className="mf-box" />
          <text x="75" y="250" className="mf-node">
            Buyer
          </text>
          <text x="75" y="268" className="mf-sub">
            pays the seller
          </text>

          {/* One unbroken line, buyer to seller. The whole point of the drawing. */}
          <path d="M150 250 H 727" className="mf-line mf-line-bold" markerEnd="url(#mf-arrow)" />
          <text x="438" y="232" className="mf-tag mf-tag-accent">
            the whole price, direct
          </text>

          <rect x="730" y="220" width="150" height="60" className="mf-box" />
          <text x="805" y="250" className="mf-node">
            Seller
          </text>
          <text x="805" y="268" className="mf-sub">
            paid in full
          </text>

          {/* BoatXchange hangs off the line rather than sitting in it. */}
          <path d="M805 280 V 330" className="mf-line mf-line-dashed" markerEnd="url(#mf-arrow)" />
          <rect x="596" y="332" width="284" height="56" className="mf-box mf-box-dashed" />
          <text x="738" y="356" className="mf-node">
            BoatXchange invoices 2%
          </text>
          <text x="738" y="374" className="mf-sub">
            after the sale, to the seller
          </text>

          <text x="0" y="356" className="mf-note">
            We are never
          </text>
          <text x="0" y="376" className="mf-note">
            on the line.
          </text>
        </g>

        <defs>
          <marker
            id="mf-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="mf-arrowhead" />
          </marker>
          <marker
            id="mf-arrow-muted"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="mf-arrowhead-muted" />
          </marker>
        </defs>
      </svg>
    </figure>
  );
}
