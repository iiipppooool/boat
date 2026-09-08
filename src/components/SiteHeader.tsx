"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Wordmark } from "./Wordmark";

const NAV = [
  { href: "/market", label: "Market" },
  { href: "/concierge", label: "AI Concierge" },
  { href: "/sell", label: "Sell a boat" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "How it works" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  // Close the mobile menu on navigation — otherwise it hangs over the new page.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header on-hull">
      <div className="wrap site-header-inner">
        <Link href="/" className="site-header-brand" aria-label="BoatXchange — home">
          <Wordmark />
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
          <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
        </button>

        <nav id={menuId} className={`site-nav${open ? " is-open" : ""}`} aria-label="Primary">
          <ul>
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="site-nav-actions">
            <Link href="/account" className="btn btn-ghost btn-sm">
              Account
            </Link>
            <Link href="/#waitlist" className="btn btn-accent btn-sm">
              Join the waiting list
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
