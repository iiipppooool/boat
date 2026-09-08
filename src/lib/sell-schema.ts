import { z } from "zod";
import {
  APPAREL_SIZES, BOAT_CLASSES, CATEGORIES, CONDITIONS, CONDITION_GRADES,
  CONTINENTS, CURRENCIES, DISCIPLINES, FITS, MATERIALS, PRICE_BASES,
  RIGGING_TYPES, SELLER_TYPES,
} from "./types";

/**
 * The seller submission contract, shared by the form and the API route so the
 * two cannot drift. Everything a listing needs is here, including the fields a
 * general classifieds site would not ask for and a rower would not buy without.
 */
export const SellSubmissionSchema = z
  .object({
    category: z.enum(CATEGORIES),
    boatClass: z.enum(BOAT_CLASSES).nullish(),
    discipline: z.enum(DISCIPLINES).nullish(),
    manufacturer: z.string().trim().min(2).max(60),
    model: z.string().trim().min(1).max(80),
    year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 2),
    condition: z.enum(CONDITIONS),
    conditionGrade: z.enum(CONDITION_GRADES),
    material: z.enum(MATERIALS),
    rigging: z.enum(RIGGING_TYPES).nullish(),
    seats: z.coerce.number().int().min(1).max(8).nullish(),
    coxed: z.boolean().nullish(),

    crewWeightMinKg: z.coerce.number().min(30).max(140).nullish(),
    crewWeightMaxKg: z.coerce.number().min(30).max(160).nullish(),
    hullWeightKg: z.coerce.number().min(1).max(250).nullish(),
    lengthCm: z.coerce.number().int().min(100).max(2200).nullish(),

    sizes: z.array(z.enum(APPAREL_SIZES)).max(6).default([]),
    fit: z.enum(FITS).nullish(),
    quantity: z.coerce.number().int().min(1).max(500).nullish(),

    price: z.coerce.number().min(1).max(500_000),
    currency: z.enum(CURRENCIES),
    priceBasis: z.enum(PRICE_BASES),

    city: z.string().trim().min(1).max(80),
    region: z.string().trim().min(1).max(80),
    country: z.string().trim().min(2).max(80),
    countryCode: z.string().trim().length(2).toUpperCase(),
    continent: z.enum(CONTINENTS),

    sellerName: z.string().trim().min(2).max(90),
    sellerType: z.enum(SELLER_TYPES),
    sellerEmail: z.email().max(120),

    highlights: z.array(z.string().trim().min(3).max(120)).min(1).max(4),
    description: z.string().trim().min(60).max(4000),
    photoNotes: z.string().trim().max(600).optional().default(""),
  })
  .refine(
    (d) =>
      d.crewWeightMinKg == null ||
      d.crewWeightMaxKg == null ||
      d.crewWeightMinKg <= d.crewWeightMaxKg,
    {
      message: "The lower end of the crew weight band must not exceed the upper end.",
      path: ["crewWeightMinKg"],
    },
  )
  .refine((d) => d.condition !== "new" || d.conditionGrade === "new", {
    message: "A boat listed as new must have its condition set to New.",
    path: ["conditionGrade"],
  })
  .refine((d) => d.category !== "shell" || Boolean(d.boatClass), {
    message: "Boats need a class, a buyer filters on it before anything else.",
    path: ["boatClass"],
  })
  .refine((d) => d.category !== "apparel" || d.sizes.length > 0, {
    message:
      "Kit needs at least one size. It is the first thing a buyer filters on, and a listing without it gets skipped.",
    path: ["sizes"],
  });

export type SellSubmission = z.infer<typeof SellSubmissionSchema>;

/** Maps zod's issue list onto `{ field: message }` for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
