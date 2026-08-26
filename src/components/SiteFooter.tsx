import Link from "next/link";
import { Wordmark } from "./Wordmark";

const SITEMAP: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Buy",
    links: [
      { href: "/market", label: "Browse the market" },
      { href: "/market?boatClass=1x", label: "Single sculls" },
      { href: "/market?boatClass=2x", label: "Doubles" },
      { href: "/market?boatClass=4x&boatClass=4-&boatClass=4%2B", label: "Fours & quads" },
      { href: "/market?boatClass=8%2B", label: "Eights" },
      { href: "/market?discipline=coastal", label: "Coastal boats" },
      { href: "/market?category=oars", label: "Oars & sculls" },
      { href: "/market?category=trailer", label: "Trailers" },
    ],
  },
  {
    heading: "Sell",
    links: [
      { href: "/sell", label: "List a boat" },
      { href: "/pricing", label: "Fees & subscriptions" },
      { href: "/pricing#boathouse", label: "Dealers & brokers" },
      { href: "/account", label: "Your account" },
      { href: "/account#invoices", label: "Invoices" },
    ],
  },
  {
    heading: "BoatXchange",
    links: [
      { href: "/about", label: "How it works" },
      { href: "/about#verification", label: "Listing verification" },
      { href: "/concierge", label: "AI Concierge" },
      { href: "/contact", label: "Contact us" },
      { href: "/login", label: "Sign in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer on-hull">
      <div className="wrap">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <Wordmark size="1.5rem" />
            <p className="small">
              The global marketplace for rowing boats — new and used. Built by
              rowers, for a sport whose boats have never had a market of their own.
            </p>
            <p className="tiny muted-on-hull">
              Registered in England &amp; Wales · Company 15,482,006<br />
              Unit 4, The Boathouse Yard, Chiswick Mall, London W4 2PS
            </p>
          </div>

          {SITEMAP.map((column) => (
            <nav key={column.heading} aria-labelledby={`footer-${column.heading}`}>
              <h2 id={`footer-${column.heading}`} className="site-footer-heading">
                {column.heading}
              </h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="site-footer-bottom">
          <p className="tiny">© {new Date().getFullYear()} BoatXchange Ltd.</p>
          <p className="tiny">
            <a href="mailto:crew@boatxchange.com">crew@boatxchange.com</a>
            <span aria-hidden="true"> · </span>
            <a href="tel:+442080771904">+44 20 8077 1904</a>
          </p>
          <ul className="site-footer-social">
            <li><a href="https://instagram.com/boatxchange" rel="me noreferrer" target="_blank">Instagram</a></li>
            <li><a href="https://www.youtube.com/@boatxchange" rel="me noreferrer" target="_blank">YouTube</a></li>
            <li><a href="https://www.strava.com/clubs/boatxchange" rel="me noreferrer" target="_blank">Strava</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
