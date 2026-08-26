import "server-only";
import { getListingBySlug, searchListings } from "@/lib/inventory";
import { formatPrice, toUsd } from "@/lib/fx";
import {
  BOAT_CLASS_LABELS, CATEGORY_LABELS, FIT_LABELS, GRADE_LABELS, MATERIAL_LABELS,
  lotSize, relativeDate, sizeRange, weightBand,
} from "@/lib/format";
import { CONTINENTS } from "@/lib/types";
import type {
  ApparelSize, BoatClass, Category, Continent, Currency, Listing, ListingQuery,
} from "@/lib/types";
import type { ConciergeMessage } from "./provider";

/**
 * Retrieval for the AI Concierge.
 *
 * The model never sees the inventory and is never asked to remember it. Every
 * turn, this module reads the conversation, turns it into a `ListingQuery`,
 * runs that query against the same repository the Market page uses, and hands
 * the model a shortlist of real records. The model's job is to choose among
 * them and explain why — not to know what is for sale.
 *
 * That ordering is what makes the answers trustworthy and what makes a small
 * model sufficient. It also means a boat that sells at 09:00 is gone from the
 * concierge's shortlist at 09:01, with no reindexing step.
 */

const SHORTLIST_SIZE = 12;

export interface ExtractedConstraints {
  sizes?: ApparelSize[];
  weightKg?: number;
  heightCm?: number;
  budgetUsd?: number;
  boatClasses?: BoatClass[];
  categories?: Category[];
  continents?: Continent[];
  conditionNew?: boolean;
  conditionUsed?: boolean;
  coastal?: boolean;
}

export interface RetrievalResult {
  listings: Listing[];
  constraints: ExtractedConstraints;
  /** Filters that had to be dropped to find anything — the model says so. */
  relaxed: string[];
  pinned: Listing | null;
}

// --- Constraint extraction -------------------------------------------------

/**
 * Ordered most specific first, and the first match wins: "coxed four" must not
 * also trip the bare "four" rule. Plurals are matched because people type
 * "singles" and "eights" as readily as the singular.
 */
const CLASS_PATTERNS: [RegExp, BoatClass[]][] = [
  [/\bcoastal\b/i, ["coastal-1x", "coastal-2x", "coastal-4x+"]],
  [/\b(singles?|1x|scull for one)\b/i, ["1x"]],
  [/\b(doubles?|2x)\b/i, ["2x"]],
  [/\b(quads?|4x)\b/i, ["4x", "4x+"]],
  [/\b(coxless pairs?|straight pairs?|2-)/i, ["2-"]],
  [/\bpairs?\b/i, ["2-", "2+"]],
  [/\b(coxed fours?|4\+)/i, ["4+"]],
  [/\b(coxless fours?|4-)/i, ["4-"]],
  [/\bfours?\b/i, ["4-", "4+", "4x"]],
  [/\b(eights?|8\+)/i, ["8+"]],
];

const CATEGORY_PATTERNS: [RegExp, Category][] = [
  [/\b(oars?|sculls?|blades?|sweeps?)\b/i, "oars"],
  [/\b(trailer|transport rack)\b/i, "trailer"],
  [/\b(rigger|riggers|gate|pin|spread)\b/i, "rigging"],
  // "zootie" is what a lot of crews actually call an all-in-one, so it is here
  // for the same reason "1x" is: people type what they say.
  [
    /\b(all[- ]?in[- ]?ones?|unisuits?|zooties?|zoot suits?|trou|kit|apparel|clothing|clothes|splash ?tops?|pogies|thermals?|jackets?|leggings?|jerseys?)\b/i,
    "apparel",
  ],
  [
    /\b(cox ?box(?:es)?|speed ?coach|stroke ?coach|ergs?|ergos?|ergometers?|slings?|boat covers?|blade bags?|gear|electronics)\b/i,
    "gear",
  ],
  // People ask for the problem, not the product. Nobody types "pogies" until
  // somebody has told them pogies exist.
  [/\b(pogies|gloves?|hand ?warmers?|keep (?:my |your )?hands warm)\b/i, "apparel"],
];

/**
 * Words that mean oars and only oars. "Scull" does not: a single scull is a
 * boat and a pair of sculls is a set of oars, and the word alone cannot tell
 * you which. Used below to stop "I want a single scull" returning oars.
 */
const UNAMBIGUOUS_OARS =
  /\b(oars?|blades?|looms?|sweep oars?|(?:pairs?|sets?) of sculls)\b/i;

/** Words people use for sizes, mapped onto the size run kit is sold in. */
const SIZE_WORDS: [RegExp, ApparelSize][] = [
  [/\bextra[- ]small\b/i, "XS"],
  [/\bextra[- ]large\b/i, "XL"],
  [/\bsmall\b/i, "S"],
  [/\bmedium\b/i, "M"],
  [/\blarge\b/i, "L"],
];

/**
 * Everything here is a regular expression, not a model call. Parsing "I'm 78kg
 * and have about £6,000" does not need a language model, and doing it in code
 * keeps the round trip to one request per turn instead of two.
 */
export function extractConstraints(text: string): ExtractedConstraints {
  const out: ExtractedConstraints = {};

  // Weight — kg directly, or pounds converted.
  const kg = text.match(/(\d{2,3}(?:\.\d)?)\s*(?:kg|kilo|kilos|kilograms?)\b/i);
  const lb = text.match(/(\d{2,3})\s*(?:lb|lbs|pounds?)\b/i);
  if (kg) out.weightKg = Math.round(Number(kg[1]));
  else if (lb) out.weightKg = Math.round(Number(lb[1]) * 0.4536);

  // Height, for context only — it never becomes a filter, because manufacturers
  // publish weight bands and not height bands.
  const cm = text.match(/(\d{3})\s*cm\b/i);
  const ft = text.match(/(\d)\s*(?:'|ft|foot|feet)\s*(\d{1,2})?/i);
  if (cm) out.heightCm = Number(cm[1]);
  else if (ft) out.heightCm = Math.round(Number(ft[1]) * 30.48 + Number(ft[2] ?? 0) * 2.54);

  // Budget — "£6,000", "$8k", "under 12000", "around 5 grand", "EUR 9000".
  // The symbol matters: someone with £7,000 has a bigger budget than someone
  // with $7,000, and the inventory is priced in five currencies.
  const money = [
    ...text.matchAll(
      /([£$€]|\b(?:gbp|eur|usd|aud|cad)\b)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b|grand\b|thousand\b)?\s*(pounds?|euros?|dollars?)?/gi,
    ),
  ];
  const budgets = money
    .map((parts) => {
      let value = Number(parts[2].replace(/,/g, ""));
      if (!Number.isFinite(value)) return 0;
      if (parts[3]) value *= 1000;
      // A currency marker, a magnitude suffix, or a four-figure number is a
      // price; a bare "78" is a weight and must not become a budget.
      const marker = (parts[1] ?? parts[4] ?? "").toLowerCase();
      if (!marker && !parts[3] && value < 1000) return 0;
      return toUsd(value, currencyFor(marker));
    })
    // Floor is deliberately low: a pair of pogies is $45, and a floor set for
    // boat prices would silently throw away every kit budget. Bare numbers under
    // 1000 are already excluded above unless something marks them as money, so
    // this does not start reading weights as budgets.
    .filter((v) => v >= 20 && v <= 500_000);
  if (budgets.length) out.budgetUsd = Math.max(...budgets);

  for (const [pattern, classes] of CLASS_PATTERNS) {
    if (pattern.test(text)) {
      out.boatClasses = [...new Set([...(out.boatClasses ?? []), ...classes])];
      break;
    }
  }
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) out.categories = [...new Set([...(out.categories ?? []), category])];
  }

  // "single scull", "double scull", "quad scull" are boats, but the word scull
  // also matched the oars rule. When the message names a boat class and nothing
  // unambiguously says oars, drop oars — otherwise the two filters intersect to
  // nothing and the shortlist relaxes its way into a page of blades.
  if (
    out.boatClasses?.length &&
    out.categories?.includes("oars") &&
    !UNAMBIGUOUS_OARS.test(text)
  ) {
    const kept = out.categories.filter((c) => c !== "oars");
    if (kept.length) out.categories = kept;
    else delete out.categories;
  }

  // Sizes. Bare "XS", "XL" and "XXL" are unambiguous; bare "S", "M" and "L" are
  // initials as often as they are sizes, so those need either the word "size"
  // in front or the word spelled out.
  const sizes = new Set<ApparelSize>();
  for (const match of text.matchAll(/\bsizes?\s*[:\-]?\s*(xs|s|m|l|xl|xxl)\b/gi)) {
    sizes.add(match[1].toUpperCase() as ApparelSize);
  }
  for (const match of text.matchAll(/\b(xs|xl|xxl)\b/gi)) {
    sizes.add(match[1].toUpperCase() as ApparelSize);
  }
  for (const [pattern, size] of SIZE_WORDS) {
    if (pattern.test(text)) sizes.add(size);
  }
  if (sizes.size) out.sizes = [...sizes];

  const continents = CONTINENTS.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
  // A few country and region words people actually type, mapped to continents.
  const hints: [RegExp, Continent][] = [
    [/\b(uk|britain|england|scotland|wales|ireland|germany|italy|france|netherlands|denmark|switzerland|spain|europe|eu)\b/i, "Europe"],
    [/\b(usa|us|united states|america|canada|mexico)\b/i, "North America"],
    [/\b(australia|new zealand|nz|aus|oceania)\b/i, "Oceania"],
  ];
  for (const [pattern, continent] of hints) {
    if (pattern.test(text) && !continents.includes(continent)) continents.push(continent);
  }
  if (continents.length) out.continents = continents;

  if (/\b(brand[- ]?new|new build|straight from the (factory|builder))\b/i.test(text)) out.conditionNew = true;
  if (/\b(used|second[- ]?hand|pre[- ]?owned|preowned)\b/i.test(text)) out.conditionUsed = true;
  if (/\bcoastal\b/i.test(text)) out.coastal = true;

  return out;
}

/** Maps a currency symbol, code or word onto a currency the inventory uses. */
function currencyFor(marker: string): Currency {
  if (/^(£|gbp|pounds?)$/.test(marker)) return "GBP";
  if (/^(€|eur|euros?)$/.test(marker)) return "EUR";
  return "USD";
}

function toQuery(c: ExtractedConstraints): ListingQuery {
  const query: ListingQuery = { perPage: SHORTLIST_SIZE, sort: "newest" };
  if (c.boatClasses?.length) query.boatClass = c.boatClasses;
  if (c.categories?.length) query.category = c.categories;
  // A size only becomes a filter once we are confident the question is about
  // kit. Otherwise "I'm a large bloke" would silently exclude every boat.
  if (c.sizes?.length && c.categories?.includes("apparel")) query.sizes = c.sizes;
  if (c.continents?.length) query.continent = c.continents;
  if (c.weightKg) query.fitsRowerKg = c.weightKg;
  // A stated budget is a ceiling, with a little headroom: a boat 10% over budget
  // that is otherwise right is worth showing someone, and they can say no.
  if (c.budgetUsd) query.maxPriceUsd = Math.round(c.budgetUsd * 1.1);
  if (c.conditionNew && !c.conditionUsed) query.condition = ["new"];
  if (c.conditionUsed && !c.conditionNew) query.condition = ["used"];
  return query;
}

/**
 * Runs the query, then relaxes it one constraint at a time until there is
 * something worth talking about. The order is deliberate, and it is the order a
 * rower would accept compromises in: "used" is usually a proxy for budget rather
 * than a real preference, so it goes first; a nearby boat slightly over budget
 * beats a cheap one on another continent, so budget widens before region; and
 * the crew weight band goes last, because it is the only constraint here that
 * actually stops a boat from working.
 */
export function retrieve(messages: ConciergeMessage[], pinnedSlug?: string | null): RetrievalResult {
  const text = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const constraints = extractConstraints(text);
  const relaxed: string[] = [];
  let query = toQuery(constraints);
  let result = searchListings(query);

  /**
   * Two tiers, because not all constraints are equal. Preference constraints get
   * relaxed to fill out a thin shortlist; defining ones — what kind of boat, and
   * whether it fits the rower — are only dropped when there is nothing at all,
   * since a page of singles is not a useful answer to a question about eights.
   */
  const relaxations: { label: string; hard: boolean; relax: () => void }[] = [
    { label: "new/used preference", hard: false, relax: () => { delete query.condition; } },
    {
      label: "budget (widened by 40%)",
      hard: false,
      relax: () => { if (query.maxPriceUsd) query.maxPriceUsd = Math.round(query.maxPriceUsd * 1.4); },
    },
    { label: "region", hard: false, relax: () => { delete query.continent; } },
    {
      label: "budget (widened again, to roughly double)",
      hard: false,
      relax: () => { if (query.maxPriceUsd) query.maxPriceUsd = Math.round(query.maxPriceUsd * 1.3); },
    },
    { label: "boat class", hard: true, relax: () => { delete query.boatClass; } },
    { label: "crew weight band", hard: true, relax: () => { delete query.fitsRowerKg; } },
    { label: "size", hard: true, relax: () => { delete query.sizes; } },
  ];

  for (const { label, hard, relax } of relaxations) {
    if (hard ? result.total > 0 : result.total >= 3) continue;
    const before = JSON.stringify(query);
    relax();
    if (JSON.stringify(query) === before) continue;
    relaxed.push(label);
    result = searchListings(query);
  }

  const pinned = pinnedSlug ? getListingBySlug(pinnedSlug) : null;
  const listings = pinned
    ? [pinned, ...result.listings.filter((l) => l.id !== pinned.id)].slice(0, SHORTLIST_SIZE)
    : result.listings;

  return { listings, constraints, relaxed, pinned };
}

// --- Prompt construction ---------------------------------------------------

export const CONCIERGE_SYSTEM = `You are the BoatXchange concierge. BoatXchange is a specialist global marketplace for rowing boats and rowing equipment.

You help people choose a boat. You are talking to rowers, so write like someone who rows: plain, specific, no marketing language, no exclamation marks. British spelling.

## The only boats that exist
Each turn you are given a shortlist of real listings currently on BoatXchange, drawn live from the inventory. That shortlist is the complete set of boats you may recommend.
- Never invent a boat, a price, a seller, a location or a specification.
- Never recommend a boat that is not in the shortlist, even if you know the manufacturer makes one.
- Refer to each boat by its reference in square brackets, exactly as given, e.g. [bx-1001]. The interface turns these into links, so get them right.
- If the shortlist does not contain anything suitable, say so plainly and say what would need to change — a bigger budget, a different class, waiting for stock. Do not pad the answer with a boat you do not believe in.

## How to advise
Lead with a recommendation, then the reasoning. Two or three boats compared is more useful than a list of eight.

The things that actually decide whether a boat is right, roughly in order:
1. **Crew weight band.** Every hull is built for a per-rower weight range. Outside it, the boat sits wrong and no amount of rigging fixes it. If you know the rower's weight, check it against each boat's band and say so explicitly.
2. **Intended use.** A club racer, a recreational sculler and a masters athlete want genuinely different hulls. A stiff race layup is wasted on someone rowing three mornings a week for enjoyment, and a wide recreational hull will frustrate someone trying to win.
3. **Experience.** A first single should be stable. Recommending a narrow race hull to a beginner is how people end up swimming and quitting.
4. **Condition and honesty.** A well-documented repair is not a problem. An undocumented one is. Say what the listing actually says.
5. **Total cost.** Boats rarely include oars. Freight on an eight is not trivial. Mention it when it matters.

## Kit, apparel and gear
The inventory is not only boats. It also carries racing kit (all-in-ones, trou, splash tops, jackets, pogies) and gear (cox boxes, stroke coaches, ergs, slings, covers). Different things decide those:

- **Size, and honesty about it.** Racing kit runs small and runs small differently at every brand. If someone gives you a size, check it against what each listing actually offers, and tell them to ask for flat chest and inside-leg measurements before buying a lot they cannot return.
- **Lots versus single items.** A club clearing out twenty-two all-in-ones is solving a different problem from one person who needs one suit. Say which a listing is, and do not push a 22-piece lot at an individual sculler.
- **What kit at a given price actually is.** Cheap second-hand trou is training kit, not race kit — thin lycra is see-through under stadium lights. Say so rather than letting someone find out at a regatta.
- **For gear, what is included and whether it still works.** A cox box without its harness is half a purchase. Batteries are the part that dies. An erg's total metres matter far less than people think.

## Style
- 150-250 words for a recommendation. Shorter for a follow-up.
- Use the seller's own currency figures as given.
- No headings unless comparing three or more boats.
- If the rower has not told you their weight, budget or intended use, and it would change your answer, ask for it — one question, not a questionnaire.
- Never claim a boat is "perfect" or "ideal". Say what it is good at and what it costs you.`;

/** Compact digest of one listing — enough to reason over, no wasted tokens. */
function digest(l: Listing): string {
  const band = weightBand(l.crewWeightMinKg, l.crewWeightMaxKg);
  const sizes = sizeRange(l.sizes);
  const bits = [
    `[${l.id}] ${l.title}`,
    l.boatClass ? BOAT_CLASS_LABELS[l.boatClass] : CATEGORY_LABELS[l.category],
    sizes ? `sizes ${sizes}` : null,
    l.fit ? FIT_LABELS[l.fit].toLowerCase() : null,
    lotSize(l.quantity),
    `${l.condition === "new" ? "new" : `used, ${GRADE_LABELS[l.conditionGrade].toLowerCase()}`}`,
    MATERIAL_LABELS[l.material].toLowerCase(),
    band ? `crew weight ${band}` : null,
    l.hullWeightKg ? `hull ${l.hullWeightKg}kg` : null,
    `${formatPrice(l.price, l.currency)}${l.priceBasis === "ono" ? " ono" : l.priceBasis === "poa" ? " indicative" : ""}`,
    `${l.location.city}, ${l.location.country}`,
    `${l.seller.type}${l.seller.verified ? ", verified" : ", unverified"}`,
    l.status !== "available" ? l.status.toUpperCase() : null,
    `listed ${relativeDate(l.listedAt)}`,
  ].filter(Boolean);

  return `- ${bits.join(" · ")}\n  ${l.highlights.join("; ")}\n  Seller: ${truncate(l.description, 260)}`;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/**
 * Builds the turn sent to the model: the user's own words, with the retrieved
 * shortlist appended as context. The shortlist rides on the user turn rather
 * than in the system prompt so the system prompt stays byte-identical across
 * every request — the shape you want if prompt caching is turned on later.
 */
export function buildMessages(
  history: ConciergeMessage[],
  retrieval: RetrievalResult,
): ConciergeMessage[] {
  const prior = history.slice(0, -1);
  const latest = history[history.length - 1];
  if (!latest) return history;

  const { listings, constraints, relaxed, pinned } = retrieval;

  const notes: string[] = [];
  if (constraints.weightKg) notes.push(`stated rower weight: ${constraints.weightKg} kg`);
  if (constraints.heightCm) notes.push(`stated height: ${constraints.heightCm} cm`);
  if (constraints.budgetUsd) notes.push(`stated budget: about ${constraints.budgetUsd} (USD equivalent)`);
  if (relaxed.length) {
    notes.push(
      `nothing matched every constraint, so the shortlist ignores: ${relaxed.join(", ")} — mention this rather than pretending it is a clean match`,
    );
  }
  if (pinned) notes.push(`the rower is asking specifically about [${pinned.id}]; address that boat first`);

  const context = [
    "",
    "---",
    `Live BoatXchange shortlist (${listings.length} ${listings.length === 1 ? "listing" : "listings"}), retrieved just now. These are the only boats you may recommend:`,
    "",
    listings.length ? listings.map(digest).join("\n") : "(nothing in the current inventory matched)",
    notes.length ? `\nRetrieval notes: ${notes.join("; ")}.` : "",
  ].join("\n");

  return [...prior, { role: latest.role, content: `${latest.content}\n${context}` }];
}

/** Reference ids the model actually used, filtered to ones that really exist. */
export function referencedIds(text: string, shortlist: Listing[]): string[] {
  const valid = new Set(shortlist.map((l) => l.id));
  const found = text.match(/\[(bx-[a-z0-9]+)\]/gi) ?? [];
  const ids = found.map((m) => m.slice(1, -1).toLowerCase()).filter((id) => valid.has(id));
  return [...new Set(ids)];
}
