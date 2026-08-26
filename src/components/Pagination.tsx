import Link from "next/link";
import { toSearchParams } from "@/lib/query";
import type { ListingQuery } from "@/lib/types";

/**
 * Real links, one page at a time. The Market grid never loads the whole
 * inventory — the page size is enforced in SQL, and this walks the offsets.
 */
export function Pagination({
  query, page, pageCount, basePath = "/market",
}: {
  query: ListingQuery;
  page: number;
  pageCount: number;
  basePath?: string;
}) {
  if (pageCount <= 1) return null;

  const href = (n: number) => {
    const params = toSearchParams({ ...query, page: n });
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const windowed = pageNumbers(page, pageCount);

  return (
    <nav className="pagination" aria-label="Listing pages">
      <Link
        href={href(Math.max(1, page - 1))}
        className="btn btn-ghost btn-sm"
        aria-disabled={page === 1}
        tabIndex={page === 1 ? -1 : undefined}
      >
        ← Previous
      </Link>

      <ol>
        {windowed.map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="pagination-gap">
              …
            </li>
          ) : (
            <li key={n}>
              <Link href={href(n)} aria-current={n === page ? "page" : undefined}>
                <span className="visually-hidden">Page </span>
                {n}
              </Link>
            </li>
          ),
        )}
      </ol>

      <Link
        href={href(Math.min(pageCount, page + 1))}
        className="btn btn-ghost btn-sm"
        aria-disabled={page === pageCount}
        tabIndex={page === pageCount ? -1 : undefined}
      >
        Next →
      </Link>
    </nav>
  );
}

function pageNumbers(page: number, pageCount: number): (number | "gap")[] {
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - (sorted[i - 1] as number) > 1) out.push("gap");
    out.push(n);
  });
  return out;
}
