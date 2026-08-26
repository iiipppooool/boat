import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

/**
 * Fraunces — display. A variable serif with an optical-size axis, so one family
 * carries both the 5rem hero (high contrast, editorial) and a 1.35rem card
 * heading (sturdy, readable) without needing a second face. Its slight
 * irregularity gives headings a hand-set feel that a neutral serif would not.
 *
 * Public Sans — body and UI. Built for dense public-service interfaces: legible
 * at 13px in a spec table, real tabular figures for prices and hull weights, and
 * a neutral voice that lets Fraunces do the talking.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://boatxchange.com"),
  title: {
    default: "BoatXchange — the global marketplace for rowing boats",
    template: "%s · BoatXchange",
  },
  description:
    "Buy and sell rowing boats worldwide: single sculls, doubles, quads, eights, coastal hulls, oars, riggers and trailers. New and used, from clubs, dealers and private owners.",
  openGraph: {
    title: "BoatXchange — the global marketplace for rowing boats",
    description:
      "The specialist marketplace for rowing boats, new and used. Verified sellers, full spec sheets, and an AI concierge that reads the live inventory.",
    siteName: "BoatXchange",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d242d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
