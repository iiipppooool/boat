"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BOAT_CLASS_LABELS, CATEGORY_LABELS, DISCIPLINE_LABELS, GRADE_LABELS,
  MATERIAL_LABELS, RIGGING_LABELS, SELLER_TYPE_LABELS,
} from "@/lib/format";
import {
  BOAT_CLASSES, CATEGORIES, CONDITION_GRADES, CONTINENTS, CURRENCIES,
  DISCIPLINES, MATERIALS, RIGGING_TYPES, SELLER_TYPES,
} from "@/lib/types";

interface Success {
  id: string;
  slug: string;
  title: string;
}

/**
 * The listing form. Long, because a rowing boat needs describing properly — the
 * crew weight band and the repair history are the difference between a listing
 * someone can act on and a photograph with a phone number under it.
 *
 * Validation is the same zod schema the API uses, so client and server cannot
 * disagree about what a valid listing is. Errors come back keyed by field and
 * render against the input they belong to.
 */
export function SellForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Success | null>(null);
  const [category, setCategory] = useState<string>("shell");
  const [condition, setCondition] = useState<string>("used");

  const isBoat = category === "shell";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});

    const form = new FormData(event.currentTarget);
    const text = (key: string) => (form.get(key) as string | null)?.trim() || undefined;
    const numeric = (key: string) => {
      const raw = text(key);
      return raw ? Number(raw) : null;
    };

    const payload = {
      category: text("category"),
      boatClass: text("boatClass") ?? null,
      discipline: text("discipline") ?? null,
      manufacturer: text("manufacturer"),
      model: text("model"),
      year: numeric("year"),
      condition: text("condition"),
      conditionGrade: text("conditionGrade"),
      material: text("material"),
      rigging: text("rigging") ?? null,
      seats: numeric("seats"),
      coxed: form.get("coxed") === "on" ? true : null,
      crewWeightMinKg: numeric("crewWeightMinKg"),
      crewWeightMaxKg: numeric("crewWeightMaxKg"),
      hullWeightKg: numeric("hullWeightKg"),
      lengthCm: numeric("lengthCm"),
      price: numeric("price"),
      currency: text("currency"),
      priceBasis: text("priceBasis"),
      city: text("city"),
      region: text("region"),
      country: text("country"),
      countryCode: text("countryCode"),
      continent: text("continent"),
      sellerName: text("sellerName"),
      sellerType: text("sellerType"),
      sellerEmail: text("sellerEmail"),
      highlights: [text("highlight1"), text("highlight2"), text("highlight3")].filter(
        (h): h is string => Boolean(h),
      ),
      description: text("description"),
      photoNotes: text("photoNotes") ?? "",
    };

    try {
      const response = await fetch("/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        setErrors(body.errors ?? { form: "Something went wrong. Try again." });
        document.querySelector<HTMLElement>("[data-error-anchor]")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
      setDone(body as Success);
    } catch {
      setErrors({ form: "Could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel sell-done">
        <p className="eyebrow">Submitted</p>
        <h2>{done.title} is in the queue.</h2>
        <p>
          Your listing has been created with reference <strong>{done.id}</strong> and is
          marked <strong>sale pending</strong> until we have completed verification —
          normally within one working day. We will email you when it goes live, and if
          anything in the specification looks off we will ask rather than guess.
        </p>
        <p className="muted small">
          Next: send us photographs. Three-quarter bow view, the full hull profile,
          the rigger, and an honest close-up of every repair. Boats with a photograph
          of the damage sell faster than boats without one — buyers assume the worst
          about what they cannot see.
        </p>
        <div className="cluster mt-5">
          <Link href={`/market/${done.slug}`} className="btn">
            View the listing
          </Link>
          <Link href="/sell" className="btn btn-ghost" onClick={() => setDone(null)}>
            List another boat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="sell-form" onSubmit={onSubmit} noValidate>
      {errors.form && (
        <p className="notice sell-form-error" data-error-anchor role="alert">
          <strong>{errors.form}</strong>
        </p>
      )}
      {Object.keys(errors).length > 0 && !errors.form && (
        <p className="notice sell-form-error" data-error-anchor role="alert">
          <strong>
            {Object.keys(errors).length}{" "}
            {Object.keys(errors).length === 1 ? "field needs" : "fields need"} attention.
          </strong>{" "}
          They are marked below.
        </p>
      )}

      <Section title="What are you selling" number="01">
        <div className="field-row">
          <Field label="Category" name="category" error={errors.category}>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Boat class"
            name="boatClass"
            error={errors.boatClass}
            hint={isBoat ? undefined : "Optional for equipment"}
          >
            <select id="boatClass" name="boatClass" defaultValue={isBoat ? "1x" : ""}>
              <option value="">Not applicable</option>
              {BOAT_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {BOAT_CLASS_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Discipline" name="discipline" error={errors.discipline}>
            <select id="discipline" name="discipline" defaultValue="sculling">
              <option value="">Not applicable</option>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {DISCIPLINE_LABELS[d]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="field-row">
          <Field label="Manufacturer" name="manufacturer" error={errors.manufacturer}>
            <input id="manufacturer" name="manufacturer" type="text" placeholder="Filippi" required />
          </Field>
          <Field label="Model" name="model" error={errors.model}>
            <input id="model" name="model" type="text" placeholder="F1" required />
          </Field>
          <Field label="Year built" name="year" error={errors.year}>
            <input id="year" name="year" type="number" min={1950} max={2028} placeholder="2021" required />
          </Field>
        </div>
      </Section>

      <Section title="Condition and specification" number="02">
        <div className="field-row">
          <Field label="New or used" name="condition" error={errors.condition}>
            <select
              id="condition"
              name="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="used">Used</option>
              <option value="new">New / built to order</option>
            </select>
          </Field>

          <Field
            label="Condition grade"
            name="conditionGrade"
            error={errors.conditionGrade}
            hint="Be honest — buyers price in what they cannot see"
          >
            <select
              id="conditionGrade"
              name="conditionGrade"
              defaultValue={condition === "new" ? "new" : "good"}
              key={condition}
            >
              {CONDITION_GRADES.filter((g) => (condition === "new" ? g === "new" : g !== "new")).map(
                (g) => (
                  <option key={g} value={g}>
                    {GRADE_LABELS[g]}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Material" name="material" error={errors.material}>
            <select id="material" name="material" defaultValue="carbon-nomex">
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {MATERIAL_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Rigging" name="rigging" error={errors.rigging}>
            <select id="rigging" name="rigging" defaultValue="">
              <option value="">Not applicable</option>
              {RIGGING_TYPES.map((r) => (
                <option key={r} value={r}>
                  {RIGGING_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="field">
          <legend className="field-label">Crew weight band (kg, per rower)</legend>
          <p className="field-hint" style={{ marginTop: 0, marginBottom: "var(--sp-3)" }}>
            The single most useful number in the whole listing, and the one buyers
            search on. It is on the builder&rsquo;s spec sheet — if you have lost it,
            ask them; they will tell you.
          </p>
          <div className="field-row">
            <label>
              <span className="visually-hidden">Lightest rower, kg</span>
              <input name="crewWeightMinKg" type="number" min={30} max={140} step={1} placeholder="from 75" />
            </label>
            <label>
              <span className="visually-hidden">Heaviest rower, kg</span>
              <input name="crewWeightMaxKg" type="number" min={30} max={160} step={1} placeholder="to 85" />
            </label>
          </div>
          {errors.crewWeightMinKg && <span className="field-error">{errors.crewWeightMinKg}</span>}
        </fieldset>

        <div className="field-row">
          <Field label="Hull weight (kg)" name="hullWeightKg" error={errors.hullWeightKg}>
            <input id="hullWeightKg" name="hullWeightKg" type="number" min={1} max={250} step={0.1} placeholder="14" />
          </Field>
          <Field label="Length (cm)" name="lengthCm" error={errors.lengthCm}>
            <input id="lengthCm" name="lengthCm" type="number" min={100} max={2200} placeholder="810" />
          </Field>
          <Field label="Seats" name="seats" error={errors.seats}>
            <input id="seats" name="seats" type="number" min={1} max={8} placeholder="1" />
          </Field>
          <div className="field">
            <span className="field-label">Coxed</span>
            <label className="checkline">
              <input type="checkbox" name="coxed" />
              <span>This boat carries a cox</span>
            </label>
          </div>
        </div>
      </Section>

      <Section title="Price and location" number="03">
        <div className="field-row">
          <Field label="Asking price" name="price" error={errors.price}>
            <input id="price" name="price" type="number" min={1} step={50} placeholder="9400" required />
          </Field>
          <Field label="Currency" name="currency" error={errors.currency}>
            <select id="currency" name="currency" defaultValue="EUR">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price basis" name="priceBasis" error={errors.priceBasis}>
            <select id="priceBasis" name="priceBasis" defaultValue="fixed">
              <option value="fixed">Fixed</option>
              <option value="ono">Or nearest offer</option>
              <option value="poa">Indicative / on application</option>
            </select>
          </Field>
        </div>

        <div className="field-row">
          <Field label="City" name="city" error={errors.city}>
            <input id="city" name="city" type="text" placeholder="Lucerne" required />
          </Field>
          <Field label="Region or state" name="region" error={errors.region}>
            <input id="region" name="region" type="text" placeholder="Central Switzerland" required />
          </Field>
          <Field label="Country" name="country" error={errors.country}>
            <input id="country" name="country" type="text" placeholder="Switzerland" required />
          </Field>
          <Field label="Country code" name="countryCode" error={errors.countryCode} hint="Two letters">
            <input id="countryCode" name="countryCode" type="text" maxLength={2} placeholder="CH" required />
          </Field>
          <Field label="Continent" name="continent" error={errors.continent}>
            <select id="continent" name="continent" defaultValue="Europe">
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Describe it" number="04">
        <div className="field">
          <span className="field-label">Three things a buyer should know</span>
          <div className="stack">
            <input name="highlight1" type="text" maxLength={120} placeholder="One owner from new, stored indoors" required />
            <input name="highlight2" type="text" maxLength={120} placeholder="Carbon wing rigger, straight and unrepaired" />
            <input name="highlight3" type="text" maxLength={120} placeholder="Includes shoes, bow ball and fitted cover" />
          </div>
          {errors.highlights && <span className="field-error">{errors.highlights}</span>}
        </div>

        <Field
          label="Full description"
          name="description"
          error={errors.description}
          hint="What it has done, how it has been stored, and every repair. Sixty characters minimum; the good listings run to a paragraph or two."
        >
          <textarea
            id="description"
            name="description"
            rows={9}
            maxLength={4000}
            placeholder="Bought new in 2021 for our lightweight squad and used for four seasons. Stored indoors in slings, never trailered abroad. Light gelcoat crazing at the bow ball and a scuff on the port gunwale from a landing stage…"
            required
          />
        </Field>

        <Field
          label="Photo notes"
          name="photoNotes"
          error={errors.photoNotes}
          hint="Optional. Tell us what your photographs will show, and we will tell you what else we need."
        >
          <textarea id="photoNotes" name="photoNotes" rows={3} maxLength={600} />
        </Field>
      </Section>

      <Section title="About you" number="05">
        <div className="field-row">
          <Field label="Your name or club" name="sellerName" error={errors.sellerName}>
            <input id="sellerName" name="sellerName" type="text" placeholder="Seeclub Reuss" required />
          </Field>
          <Field label="Selling as" name="sellerType" error={errors.sellerType}>
            <select id="sellerType" name="sellerType" defaultValue="private">
              {SELLER_TYPES.map((s) => (
                <option key={s} value={s}>
                  {SELLER_TYPE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email" name="sellerEmail" error={errors.sellerEmail} hint="Never shown publicly">
            <input id="sellerEmail" name="sellerEmail" type="email" placeholder="you@club.org" required />
          </Field>
        </div>
      </Section>

      <div className="sell-submit">
        <button type="submit" className="btn btn-accent btn-lg" disabled={busy}>
          {busy ? "Submitting…" : "Submit listing"}
        </button>
        <p className="tiny muted">
          Listing is free. Nothing is charged unless the boat sells — see{" "}
          <Link href="/pricing">pricing</Link>. Your listing goes live once we have
          completed <Link href="/about#verification">verification</Link>.
        </p>
      </div>
    </form>
  );
}

function Section({
  title, number, children,
}: {
  title: string;
  number: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sell-section">
      <header className="sell-section-head">
        <span className="sell-section-number">{number}</span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Field({
  label, name, error, hint, children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
