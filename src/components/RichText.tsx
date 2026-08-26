"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * A very small renderer for the concierge's replies.
 *
 * It builds React elements rather than setting innerHTML, so model output can
 * never inject markup — the worst a strange response can do is look odd. It
 * understands exactly what the concierge is asked to produce: paragraphs,
 * bold, ordered and unordered lists, ordinary links, and BoatXchange listing
 * references like [bx-1001], which become links to the listing itself.
 */

export interface RefTarget {
  id: string;
  slug: string;
  title: string;
}

export function RichText({ text, refs }: { text: string; refs: Map<string, RefTarget> }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const isBullets = lines.every((l) => /^\s*[-*]\s+/.test(l));
        const isNumbered = lines.length > 1 && lines.every((l) => /^\s*\d+[.)]\s+/.test(l));

        if (isBullets) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ""), refs)}</li>
              ))}
            </ul>
          );
        }
        if (isNumbered) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""), refs)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l, refs)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

/** Matches bold, markdown links, and bare [bx-…] references, in that order. */
const INLINE = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\[bx-[a-z0-9]+\])/gi;

function inline(text: string, refs: Map<string, RefTarget>): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const token = match[0];

    if (token.startsWith("**")) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (/^\[bx-/i.test(token)) {
      const id = token.slice(1, -1).toLowerCase();
      const target = refs.get(id);
      out.push(
        target ? (
          <Link key={key++} href={`/market/${target.slug}`} className="ref-link">
            {target.title}
          </Link>
        ) : (
          // An id the retrieval step never supplied: drop it rather than render a
          // dead reference to a boat that may not exist.
          <span key={key++} className="ref-link ref-link-unknown">
            this listing
          </span>
        ),
      );
    } else {
      const parts = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (parts && (parts[2].startsWith("/") || parts[2].startsWith("https://"))) {
        out.push(
          <Link key={key++} href={parts[2]}>
            {parts[1]}
          </Link>,
        );
      } else {
        out.push(parts ? parts[1] : token);
      }
    }
    last = index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}
