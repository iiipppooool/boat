import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with BoatXchange — support, listing verification, dealer enquiries and press.",
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
              Four of us, all rowers, based in west London and answering our own
              email. One working day, usually a lot less.
            </p>
          </div>
        </div>
      </div>

      <div className="wrap contact-layout section-tight">
        <ContactForm />

        <aside className="stack">
          <div className="panel panel-quiet">
            <h2 className="concierge-aside-title">Direct</h2>
            <dl className="contact-list">
              <div>
                <dt>General &amp; support</dt>
                <dd><a href="mailto:crew@boatxchange.com">crew@boatxchange.com</a></dd>
              </div>
              <div>
                <dt>Listing verification</dt>
                <dd><a href="mailto:verify@boatxchange.com">verify@boatxchange.com</a></dd>
              </div>
              <div>
                <dt>Dealers &amp; clubs</dt>
                <dd><a href="mailto:boathouse@boatxchange.com">boathouse@boatxchange.com</a></dd>
              </div>
              <div>
                <dt>Press</dt>
                <dd><a href="mailto:press@boatxchange.com">press@boatxchange.com</a></dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd><a href="tel:+442080771904">+44 20 8077 1904</a></dd>
              </div>
            </dl>
            <p className="small muted mt-4">
              Weekdays 08:00–18:00 UK time. We are usually on the water before 08:00.
            </p>
          </div>

          <div className="panel panel-quiet">
            <h2 className="concierge-aside-title">Post</h2>
            <address className="contact-address">
              BoatXchange Ltd<br />
              Unit 4, The Boathouse Yard<br />
              Chiswick Mall<br />
              London W4 2PS<br />
              United Kingdom
            </address>
            <p className="tiny muted mt-4">
              Registered in England &amp; Wales, company 15,482,006.<br />
              VAT GB 429 8817 03.
            </p>
          </div>

          <div className="panel panel-quiet">
            <h2 className="concierge-aside-title">Elsewhere</h2>
            <ul className="contact-social">
              <li><a href="https://instagram.com/boatxchange" rel="me noreferrer" target="_blank">Instagram — boats, mostly</a></li>
              <li><a href="https://www.youtube.com/@boatxchange" rel="me noreferrer" target="_blank">YouTube — buying guides</a></li>
              <li><a href="https://www.strava.com/clubs/boatxchange" rel="me noreferrer" target="_blank">Strava — the BoatXchange club</a></li>
            </ul>
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
