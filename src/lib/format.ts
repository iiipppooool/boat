import type {
  BoatClass, Category, ConditionGrade, Discipline, Material,
  RiggingType, SellerType,
} from "./types";

export const BOAT_CLASS_LABELS: Record<BoatClass, string> = {
  "1x": "Single scull (1x)",
  "2x": "Double scull (2x)",
  "2-": "Coxless pair (2-)",
  "2+": "Coxed pair (2+)",
  "4x": "Quad scull (4x)",
  "4x+": "Coxed quad (4x+)",
  "4-": "Coxless four (4-)",
  "4+": "Coxed four (4+)",
  "8+": "Eight (8+)",
  "coastal-1x": "Coastal single",
  "coastal-2x": "Coastal double",
  "coastal-4x+": "Coastal coxed quad",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  shell: "Boats",
  oars: "Oars & sculls",
  rigging: "Riggers & parts",
  trailer: "Trailers",
};

export const MATERIAL_LABELS: Record<Material, string> = {
  carbon: "Carbon",
  "carbon-nomex": "Carbon / Nomex honeycomb",
  "carbon-honeycomb": "Carbon honeycomb",
  composite: "Composite",
  fibreglass: "Fibreglass",
  wood: "Wood",
  aluminium: "Aluminium",
  steel: "Steel",
};

export const RIGGING_LABELS: Record<RiggingType, string> = {
  conventional: "Conventional",
  "carbon-wing": "Carbon wing",
  "aluminium-wing": "Aluminium wing",
  "back-mounted": "Back-mounted",
};

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  sculling: "Sculling",
  sweep: "Sweep",
  coastal: "Coastal",
};

export const GRADE_LABELS: Record<ConditionGrade, string> = {
  new: "New",
  excellent: "Excellent",
  good: "Good",
  fair: "Fair — needs work",
};

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  private: "Private seller",
  club: "Club",
  dealer: "Dealer",
  manufacturer: "Manufacturer",
};

/** "3 days ago" / "last updated 2 weeks ago" — listing freshness matters here. */
export function relativeDate(iso: string, now = new Date()): string {
  const then = new Date(`${iso}T12:00:00Z`).getTime();
  const days = Math.round((now.getTime() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const years = Math.round(days / 365);
  return years === 1 ? "a year ago" : `${years} years ago`;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

/** "75–85 kg" — the per-rower weight band. */
export function weightBand(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}–${max} kg`;
  return min != null ? `${min} kg and up` : `up to ${max} kg`;
}

export function metres(cm: number | null): string | null {
  return cm == null ? null : `${(cm / 100).toFixed(2)} m`;
}
