"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId } from "react";
import type { ListingSort } from "@/lib/types";

const OPTIONS: { value: ListingSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Longest listed" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "year-desc", label: "Year: newest hull" },
];

/** Writes `sort` into the URL and resets to page one. */
export function SortControl({ value }: { value: ListingSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();

  return (
    <div className="sort-control">
      <label className="field-label" htmlFor={id}>
        Sort
      </label>
      <select
        id={id}
        name="sort"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
