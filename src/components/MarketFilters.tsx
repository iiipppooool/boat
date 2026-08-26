"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BOAT_CLASS_LABELS, CATEGORY_LABELS, DISCIPLINE_LABELS, FIT_LABELS,
  GRADE_LABELS, MATERIAL_LABELS, RIGGING_LABELS, SELLER_TYPE_LABELS,
} from "@/lib/format";
import {
  APPAREL_SIZES, CONDITION_GRADES, CONTINENTS, DISCIPLINES, FITS, MATERIALS,
  RIGGING_TYPES, SELLER_TYPES,
} from "@/lib/types";
import type { BoatClass, Category, ListingQuery, MarketFacets } from "@/lib/types";

/**
 * The filter panel is a real GET form pointed at /market, so it works with
 * JavaScript disabled and every filtered view is a shareable URL. With JS on it
 * submits itself on change (debounced for typed fields) — the Apply button stays
 * visible because some people would rather set six filters and then commit.
 *
 * Submitting drops `page`, which is what you want: changing a filter should
 * return you to page one, not to page four of a different result set.
 */
export function MarketFilters({
  query,
  facets,
  activeCount,
}: {
  query: ListingQuery;
  facets: MarketFacets;
  activeCount: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setEnhanced(true), []);

  const submit = () => formRef.current?.requestSubmit();

  const debouncedSubmit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitSoon = () => {
    if (debouncedSubmit.current) clearTimeout(debouncedSubmit.current);
    debouncedSubmit.current = setTimeout(submit, 500);
  };

  const has = (list: readonly string[] | undefined, value: string) =>
    Boolean(list?.includes(value));

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost filters-toggle"
        aria-expanded={open}
        aria-controls="market-filters"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide filters" : "Show filters"}
        {activeCount > 0 && <span className="pill pill-accent">{activeCount}</span>}
      </button>

      <form
        id="market-filters"
        ref={formRef}
        method="get"
        action="/market"
        className={`filters${open ? " is-open" : ""}`}
        onChange={(e) => {
          if (!enhanced) return;
          const target = e.target as HTMLElement;
          const typed = target instanceof HTMLInputElement &&
            ["text", "search", "number"].includes(target.type);
          typed ? submitSoon() : submit();
        }}
      >
        <div className="filters-head">
          <h2 className="filters-title">Filter</h2>
          {activeCount > 0 && (
            <button
              type="button"
              className="filters-clear"
              onClick={() => router.push("/market")}
            >
              Clear {activeCount}
            </button>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="filter-q">
            Search
          </label>
          <input
            id="filter-q"
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Empacher, coastal, Henley…"
          />
        </div>

        <FilterGroup label="What">
          {facets.categories.map((c) => (
            <Check
              key={c.value}
              name="category"
              value={c.value}
              label={CATEGORY_LABELS[c.value as Category] ?? c.value}
              count={c.count}
              defaultChecked={has(query.category, c.value)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Boat type">
          {facets.boatClasses.map((c) => (
            <Check
              key={c.value}
              name="boatClass"
              value={c.value}
              label={BOAT_CLASS_LABELS[c.value as BoatClass] ?? c.value}
              count={c.count}
              defaultChecked={has(query.boatClass, c.value)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Discipline">
          {DISCIPLINES.map((d) => (
            <Check
              key={d}
              name="discipline"
              value={d}
              label={DISCIPLINE_LABELS[d]}
              defaultChecked={has(query.discipline, d)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="New or used">
          <Check name="condition" value="new" label="New" defaultChecked={has(query.condition, "new")} />
          <Check name="condition" value="used" label="Used" defaultChecked={has(query.condition, "used")} />
        </FilterGroup>

        <FilterGroup label="Condition">
          {CONDITION_GRADES.filter((g) => g !== "new").map((g) => (
            <Check
              key={g}
              name="conditionGrade"
              value={g}
              label={GRADE_LABELS[g]}
              defaultChecked={has(query.conditionGrade, g)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Price (USD equivalent)">
          <div className="field-row">
            <label>
              <span className="visually-hidden">Minimum price in US dollars</span>
              <input
                type="number"
                name="minPrice"
                min={0}
                step={100}
                placeholder={`from ${facets.priceUsdRange.min}`}
                defaultValue={query.minPriceUsd ?? ""}
              />
            </label>
            <label>
              <span className="visually-hidden">Maximum price in US dollars</span>
              <input
                type="number"
                name="maxPrice"
                min={0}
                step={100}
                placeholder={`to ${facets.priceUsdRange.max}`}
                defaultValue={query.maxPriceUsd ?? ""}
              />
            </label>
          </div>
          <span className="field-hint">
            Prices are shown in the seller&rsquo;s own currency; this filter compares
            them at a fixed reference rate.
          </span>
        </FilterGroup>

        <FilterGroup label="Fits a rower of">
          <label>
            <span className="visually-hidden">Rower weight in kilograms</span>
            <input
              type="number"
              name="rowerKg"
              min={30}
              max={160}
              step={1}
              placeholder="e.g. 78"
              defaultValue={query.fitsRowerKg ?? ""}
            />
          </label>
          <span className="field-hint">
            Shows only boats whose manufacturer weight band covers this per-rower
            weight in kg. The spec that matters most, and the one most listings bury.
          </span>
        </FilterGroup>

        <FilterGroup label="Size">
          <div className="size-grid">
            {APPAREL_SIZES.map((size) => (
              <label key={size} className="size-chip">
                <input
                  type="checkbox"
                  name="size"
                  value={size}
                  defaultChecked={has(query.sizes, size)}
                />
                <span>{size}</span>
              </label>
            ))}
          </div>
          <span className="field-hint">
            Matches kit offering that size — including a club lot that happens to
            contain one.
          </span>
        </FilterGroup>

        <FilterGroup label="Cut">
          {FITS.map((f) => (
            <Check
              key={f}
              name="fit"
              value={f}
              label={FIT_LABELS[f]}
              defaultChecked={has(query.fit, f)}
            />
          ))}
          <label className="checkline">
            <input type="checkbox" name="bulk" value="true" defaultChecked={query.bulkOnly} />
            <span>Bulk lots only</span>
          </label>
        </FilterGroup>

        <FilterGroup label="Material &amp; fabric">
          {MATERIALS.filter(
            (m) => !["aluminium", "steel", "wood", "electronics", "mixed-textile"].includes(m),
          ).map((m) => (
            <Check
              key={m}
              name="material"
              value={m}
              label={MATERIAL_LABELS[m]}
              defaultChecked={has(query.material, m)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Rigging">
          {RIGGING_TYPES.map((r) => (
            <Check
              key={r}
              name="rigging"
              value={r}
              label={RIGGING_LABELS[r]}
              defaultChecked={has(query.rigging, r)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Seats">
          {[1, 2, 4, 8].map((n) => (
            <Check
              key={n}
              name="seats"
              value={String(n)}
              label={n === 1 ? "1 seat" : `${n} seats`}
              defaultChecked={Boolean(query.seats?.includes(n))}
            />
          ))}
          <label className="checkline">
            <input
              type="checkbox"
              name="coxed"
              value="true"
              defaultChecked={query.coxed === true}
            />
            <span>Coxed only</span>
          </label>
        </FilterGroup>

        <FilterGroup label="Manufacturer">
          <div className="filters-scroll">
            {facets.manufacturers.map((m) => (
              <Check
                key={m.value}
                name="manufacturer"
                value={m.value}
                label={m.value}
                count={m.count}
                defaultChecked={has(query.manufacturer, m.value)}
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Region">
          {CONTINENTS.filter((c) =>
            facets.continents.some((f) => f.value === c),
          ).map((c) => (
            <Check
              key={c}
              name="continent"
              value={c}
              label={c}
              count={facets.continents.find((f) => f.value === c)?.count}
              defaultChecked={has(query.continent, c)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Seller">
          {SELLER_TYPES.map((s) => (
            <Check
              key={s}
              name="sellerType"
              value={s}
              label={SELLER_TYPE_LABELS[s]}
              defaultChecked={has(query.sellerType, s)}
            />
          ))}
          <label className="checkline">
            <input type="checkbox" name="verified" value="true" defaultChecked={query.verifiedOnly} />
            <span>Verified sellers only</span>
          </label>
        </FilterGroup>

        <FilterGroup label="Availability">
          <Check name="status" value="available" label="Available" defaultChecked={has(query.status, "available")} />
          <Check name="status" value="pending" label="Sale pending" defaultChecked={has(query.status, "pending")} />
          <Check name="status" value="sold" label="Recently sold" defaultChecked={has(query.status, "sold")} />
        </FilterGroup>

        {/* Preserved so sort survives a filter change; the sort control lives above the grid. */}
        {query.sort && <input type="hidden" name="sort" value={query.sort} />}

        <button type="submit" className="btn btn-block">
          Apply filters
        </button>
      </form>
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="filter-group">
      <legend className="field-label">{label}</legend>
      {children}
    </fieldset>
  );
}

function Check({
  name, value, label, count, defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  count?: number;
  defaultChecked?: boolean;
}) {
  return (
    <label className="checkline">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} />
      <span>{label}</span>
      {count != null && <span className="count">{count}</span>}
    </label>
  );
}
