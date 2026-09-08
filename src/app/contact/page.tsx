import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { SITE, hasContactDetails } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with BoatXchange: support, listing verification, dealer enquiries and press.",
};

export default function ContactPage() {
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <p className="eyebrow">Contact</p>
          <div className="page-head-grid">
            <h1>Talk to us.</h1>
            <p className="lede">
              Rowers answering our own email. One working day, usually a lot less.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap contact-layout section-tight">
        <ContactForm />

        <aside className="stack">
          {/* Every direct contact detail comes from src/lib/site.ts. Blank
              entries are omitted rather than shown as placeholders, so this
              panel disappears entirely until real details are configured. */}
          {hasContactDetails() && (
            <div className="panel panel-quiet">
              <h2 className="concierge-aside-title">Direct</h2>
              <dl className="contact-list">
                {SITE.contact.email && (
                  <div>
                    <dt>General &amp; support</dt>
                    <dd><a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a></dd>
                  </div>
                )}
                {SITE.contact.verificationEmail && (
                  <div>
                    <dt>Listing verification</dt>
                    <dd><a href={`mailto:${SITE.contact.verificationEmail}`}>{SITE.contact.verificationEmail}</a></dd>
                  </div>
                )}
                {SITE.contact.dealerEmail && (
                  <div>
                    <dt>Dealers &amp; clubs</dt>
                    <dd><a href={`mailto:${SITE.contact.dealerEmail}`}>{SITE.contact.dealerEmail}</a></dd>
                  </div>
                )}
                {SITE.contact.pressEmail && (
                  <div>
                    <dt>Press</dt>
                    <dd><a href={`mailto:${SITE.contact.pressEmail}`}>{SITE.contact.pressEmail}</a></dd>
                  </div>
                )}
                {SITE.contact.phone && (
                  <div>
                    <dt>Phone</dt>
                    <dd><a href={`tel:${SITE.contact.phone}`}>{SITE.contact.phoneDisplay || SITE.contact.phone}</a></dd>
                  </div>
                )}
              </dl>
              {SITE.contact.hours && <p className="small muted mt-4">{SITE.contact.hours}</p>}
            </div>
          )}

          {SITE.social.length > 0 && (
            <div className="panel panel-quiet">
              <h2 className="concierge-aside-title">Elsewhere</h2>
              <ul className="contact-social">
                {SITE.social.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} rel="me noreferrer" target="_blank">{s.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel panel-quiet">
            <h2 className="concierge-aside-title">Response times</h2>
            <p className="small muted">
              The form is the fastest route and reaches the same people as email.
              If your message is about a specific listing, quoting its reference,
              the <code>bx-</code> code on the listing page, gets you an answer
              without a round trip.
            </p>
          </div>

          <p className="small">
            <Link href="/about#verification" className="link-arrow">
              Reporting a problem with a listing
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}
