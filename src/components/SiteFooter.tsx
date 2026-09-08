import Link from "next/link";
import { SITE } from "@/lib/site";
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
      { href: "/market?category=apparel", label: "Kit & apparel" },
      { href: "/market?category=gear", label: "Gear & electronics" },
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
      { href: "/#waitlist", label: "Join the waiting list" },
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
              The global marketplace for rowing boats, kit and gear — new and used.
              Built by rowers, for a sport whose boats have never had a market of
              their own.
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
          {/* Contact details come from src/lib/site.ts and render only when set,
              so an unconfigured site shows nothing rather than a placeholder. */}
          {(SITE.contact.email || SITE.contact.phone) && (
            <p className="tiny">
              {SITE.contact.email && (
                <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
              )}
              {SITE.contact.email && SITE.contact.phone && <span aria-hidden="true"> · </span>}
              {SITE.contact.phone && (
                <a href={`tel:${SITE.contact.phone}`}>{SITE.contact.phoneDisplay || SITE.contact.phone}</a>
              )}
            </p>
          )}
          {SITE.social.length > 0 && (
            <ul className="site-footer-social">
              {SITE.social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} rel="me noreferrer" target="_blank">{s.label}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
