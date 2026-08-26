import {
  BOAT_CLASSES, CATEGORIES, CONDITIONS, CONDITION_GRADES, CONTINENTS,
  DISCIPLINES, LISTING_SORTS, LISTING_STATUSES, MATERIALS, RIGGING_TYPES,
  SELLER_TYPES,
} from "./types";
import type { ListingQuery } from "./types";

/**
 * Turns URL search params into a validated `ListingQuery`.
 *
 * Filters live in the URL rather than in component state so a filtered market
 * view is shareable, linkable from the footer and the concierge, survives a
 * refresh, and renders on the server. Anything not on the allow-lists in
 * `types.ts` is dropped rather than passed through to SQL.
 */

type ParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

function all(params: ParamsLike, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key);
  const raw = params[key];
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function one(params: ParamsLike, key: string): string | undefined {
  return all(params, key)[0];
}

function pick<T extends string>(values: string[], allowed: readonly T[]): T[] | undefined {
  const set = new Set<string>(allowed);
  const out = values.filter((v): v is T => set.has(v));
  return out.length ? out : undefined;
}

function num(value: string | undefined, min: number, max: number): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(Math.max(n, min), max);
}

export function parseListingQuery(params: ParamsLike): ListingQuery {
  const coxedRaw = one(params, "coxed");
  const seats = all(params, "seats")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 8);

  return {
    q: one(params, "q")?.slice(0, 120) || undefined,
    category: pick(all(params, "category"), CATEGORIES),
    boatClass: pick(all(params, "boatClass"), BOAT_CLASSES),
    discipline: pick(all(params, "discipline"), DISCIPLINES),
    condition: pick(all(params, "condition"), CONDITIONS),
    conditionGrade: pick(all(params, "conditionGrade"), CONDITION_GRADES),
    material: pick(all(params, "material"), MATERIALS),
    rigging: pick(all(params, "rigging"), RIGGING_TYPES),
    manufacturer: all(params, "manufacturer").filter((m) => m.length <= 40).slice(0, 12) || undefined,
    continent: pick(all(params, "continent"), CONTINENTS),
    sellerType: pick(all(params, "sellerType"), SELLER_TYPES),
    status: pick(all(params, "status"), LISTING_STATUSES),
    seats: seats.length ? seats : undefined,
    coxed: coxedRaw === "true" ? true : coxedRaw === "false" ? false : undefined,
    minPriceUsd: num(one(params, "minPrice"), 0, 1_000_000),
    maxPriceUsd: num(one(params, "maxPrice"), 0, 1_000_000),
    fitsRowerKg: num(one(params, "rowerKg"), 30, 160),
    verifiedOnly: one(params, "verified") === "true" || undefined,
    sort: pick([one(params, "sort") ?? ""], LISTING_SORTS)?.[0],
    page: num(one(params, "page"), 1, 9999),
    perPage: num(one(params, "perPage"), 1, 48),
  };
}

/** Rebuilds a query string from a query object — used for pagination links. */
export function toSearchParams(query: ListingQuery): URLSearchParams {
  const params = new URLSearchParams();
  const push = (key: string, values?: readonly (string | number)[]) => {
    values?.forEach((v) => params.append(key, String(v)));
  };

  if (query.q) params.set("q", query.q);
  push("category", query.category);
  push("boatClass", query.boatClass);
  push("discipline", query.discipline);
  push("condition", query.condition);
  push("conditionGrade", query.conditionGrade);
  push("material", query.material);
  push("rigging", query.rigging);
  push("manufacturer", query.manufacturer);
  push("continent", query.continent);
  push("sellerType", query.sellerType);
  push("status", query.status);
  push("seats", query.seats);
  if (query.coxed !== undefined) params.set("coxed", String(query.coxed));
  if (query.minPriceUsd != null) params.set("minPrice", String(query.minPriceUsd));
  if (query.maxPriceUsd != null) params.set("maxPrice", String(query.maxPriceUsd));
  if (query.fitsRowerKg != null) params.set("rowerKg", String(query.fitsRowerKg));
  if (query.verifiedOnly) params.set("verified", "true");
  if (query.sort) params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));

  return params;
}

/** How many filters the user has actually applied — drives the "clear" affordance. */
export function countActiveFilters(query: ListingQuery): number {
  const groups: (unknown[] | undefined)[] = [
    query.category, query.boatClass, query.discipline, query.condition,
    query.conditionGrade, query.material, query.rigging, query.manufacturer,
    query.continent, query.sellerType, query.status, query.seats,
  ];
  let n = groups.reduce<number>((sum, g) => sum + (g?.length ?? 0), 0);
  if (query.q) n += 1;
  if (query.coxed !== undefined) n += 1;
  if (query.minPriceUsd != null) n += 1;
  if (query.maxPriceUsd != null) n += 1;
  if (query.fitsRowerKg != null) n += 1;
  if (query.verifiedOnly) n += 1;
  return n;
}
