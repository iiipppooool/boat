"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  WAITLIST_INTERESTS,
  WAITLIST_INTEREST_LABELS,
  WAITLIST_ROLES,
  WAITLIST_ROLE_LABELS,
} from "@/lib/waitlist-schema";

type Interest = (typeof WAITLIST_INTERESTS)[number];
type Role = (typeof WAITLIST_ROLES)[number];

interface Response {
  ok: boolean;
  existing?: boolean;
  position?: number | null;
  total?: number | null;
  emailed?: boolean;
  errors?: Record<string, string>;
}

export interface WaitlistFormProps {
  /**
   * `compact` is the hero: one field and a button, because a hero form with
   * eight inputs is a hero form nobody fills in. The rest of the questions
   * unfold once the address is being typed.
   *
   * `full` is the standalone section further down, where somebody who has read
   * the argument is willing to tell us more.
   */
  variant?: "compact" | "full";
  defaultInterest?: Interest;
  id?: string;
}

/** True when the visitor has asked their system to stop things moving. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listen = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listen);
    return () => query.removeEventListener("change", listen);
  }, []);
  return reduced;
}

/**
 * Counts up to a number over about a second, easing out.
 *
 * A queue position is the one genuinely satisfying thing we can show somebody
 * at the end of this form, so it arrives rather than simply appearing. Returns
 * the target immediately when motion is reduced.
 */
function useCountUp(target: number | null, reduced: boolean): number | null {
  const [value, setValue] = useState(target === null ? null : reduced ? target : 0);

  useEffect(() => {
    if (target === null) return setValue(null);
    if (reduced) return setValue(target);

    let frame = 0;
    const started = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);

  return value;
}

/**
 * The water behind the card.
 *
 * Three bands of hand-drawn swell on slightly different periods, so they never
 * quite line up and the loop is hard to spot. Purely decorative: aria-hidden,
 * and the animation is switched off entirely under reduced motion.
 */
function Water() {
  return (
    <div className="wl-water" aria-hidden="true">
      <svg viewBox="0 0 1200 300" preserveAspectRatio="none">
        <path
          className="wl-swell wl-swell-1"
          d="M0 190 C 150 160, 250 220, 400 190 S 650 160, 800 190 S 1050 220, 1200 190 V300 H0 Z"
        />
        <path
          className="wl-swell wl-swell-2"
          d="M0 215 C 180 190, 260 245, 440 215 S 700 190, 880 215 S 1080 245, 1200 215 V300 H0 Z"
        />
        <path
          className="wl-swell wl-swell-3"
          d="M0 245 C 200 225, 300 270, 500 245 S 760 225, 960 245 S 1120 270, 1200 245 V300 H0 Z"
        />
      </svg>
      <span className="wl-buoys">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.28}s` }} />
        ))}
      </span>
    </div>
  );
}

/** The boat that crosses the confirmation face once, then rests. */
function CrossingBoat() {
  return (
    <svg className="wl-boat" viewBox="0 0 260 90" aria-hidden="true">
      <g className="wl-boat-rock">
        <path className="wl-boat-wake" d="M6 62 H 120" />
        <path
          className="wl-boat-hull"
          d="M28 58 C 70 46, 150 44, 214 52 C 176 66, 96 68, 28 58 Z"
        />
        <path className="wl-boat-oar" d="M112 52 L 84 30" />
        <path className="wl-boat-oar" d="M124 56 L 156 76" />
        <circle className="wl-boat-blade" cx="80" cy="27" r="6" />
        <circle className="wl-boat-blade" cx="160" cy="79" r="6" />
      </g>
    </svg>
  );
}

export function WaitlistForm({ variant = "compact", defaultInterest, id }: WaitlistFormProps) {
  const uid = useId();
  const reduced = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("rower");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [interests, setInterests] = useState<Interest[]>(
    defaultInterest ? [defaultInterest] : [],
  );
  const [expanded, setExpanded] = useState(variant === "full");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [result, setResult] = useState<Response | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const counted = useCountUp(state === "done" ? (result?.position ?? null) : null, reduced);

  /**
   * The card leans towards the pointer. Kept to a few degrees — enough that the
   * surface reads as a physical object catching the light, not enough to make
   * the type wobble while somebody is trying to read it.
   */
  const tilt = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduced || !cardRef.current) return;

      // A surface that leans away while you are reaching for a chip is a
      // surface that is harder to use than a flat one. The lean is for looking
      // at, so it stops the moment the pointer is over something to press.
      if ((event.target as HTMLElement).closest("input, select, textarea, button, label")) {
        cardRef.current.style.setProperty("--wl-ry", "0deg");
        cardRef.current.style.setProperty("--wl-rx", "0deg");
        return;
      }

      const box = cardRef.current.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      cardRef.current.style.setProperty("--wl-ry", `${x * 5}deg`);
      cardRef.current.style.setProperty("--wl-rx", `${-y * 3.5}deg`);
      cardRef.current.style.setProperty("--wl-gx", `${(x + 0.5) * 100}%`);
      cardRef.current.style.setProperty("--wl-gy", `${(y + 0.5) * 100}%`);
    },
    [reduced],
  );

  const level = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--wl-ry", "0deg");
    cardRef.current.style.setProperty("--wl-rx", "0deg");
  }, []);

  function toggleInterest(value: Interest) {
    setInterests((current) =>
      current.includes(value) ? current.filter((i) => i !== value) : [...current, value],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setErrors({});

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, role, country, interests, note, website }),
      });
      const data = (await response.json()) as Response;

      if (!response.ok || !data.ok) {
        setErrors(data.errors ?? { form: "Something went wrong. Try again in a moment." });
        setState("error");
        return;
      }

      setResult(data);
      setState("done");
    } catch {
      setErrors({ form: "We could not reach the server. Check your connection and try again." });
      setState("error");
    }
  }

  const busy = state === "sending";
  const done = state === "done";

  return (
    <div
      className={`wl wl-${variant}${done ? " is-done" : ""}${reduced ? " is-still" : ""}`}
      id={id}
      onPointerMove={tilt}
      onPointerLeave={level}
    >
      <div className="wl-card" ref={cardRef}>
        <div className="wl-sheen" aria-hidden="true" />

        {/* ---------------- Front: the form ---------------- */}
        <div className="wl-face wl-face-front" aria-hidden={done}>
          <Water />

          <form className="wl-form" onSubmit={submit} noValidate>
            {variant === "full" && (
              <p className="wl-heading">
                <span className="wl-heading-mark" aria-hidden="true" />
                Put your name down
              </p>
            )}

            <div className="wl-line">
              <div className="wl-field">
                <label className="wl-label" htmlFor={`${uid}-email`}>
                  Email address
                </label>
                <input
                  id={`${uid}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  disabled={done}
                  placeholder="you@club.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setExpanded(true)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? `${uid}-email-error` : undefined}
                />
                {errors.email && (
                  <p className="wl-error" id={`${uid}-email-error`}>
                    {errors.email}
                  </p>
                )}
              </div>

              <button type="submit" className="wl-submit" disabled={busy || done}>
                <span className="wl-submit-label">
                  {busy ? "Pulling…" : "Join the waiting list"}
                </span>
                <span className="wl-submit-stroke" aria-hidden="true" />
              </button>
            </div>

            {/* Honeypot: hidden from sight and from screen readers. */}
            <div className="visually-hidden" aria-hidden="true">
              <label htmlFor={`${uid}-website`}>Website</label>
              <input
                id={`${uid}-website`}
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className={`wl-more${expanded ? " is-open" : ""}`}>
              <div className="wl-more-inner">
                <div className="wl-row">
                  <div className="wl-field">
                    <label className="wl-label" htmlFor={`${uid}-name`}>
                      Name <span className="wl-optional">optional</span>
                    </label>
                    <input
                      id={`${uid}-name`}
                      type="text"
                      autoComplete="name"
                      disabled={done}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="wl-field">
                    <label className="wl-label" htmlFor={`${uid}-country`}>
                      Country <span className="wl-optional">optional</span>
                    </label>
                    <input
                      id={`${uid}-country`}
                      type="text"
                      autoComplete="country-name"
                      placeholder="United Kingdom"
                      disabled={done}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>
                <p className="wl-hint">
                  We open region by region, starting where the most of you are. The
                  country box is how you vote for yours.
                </p>

                <div className="wl-field">
                  <label className="wl-label" htmlFor={`${uid}-role`}>
                    Which are you
                  </label>
                  <select
                    id={`${uid}-role`}
                    value={role}
                    disabled={done}
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    {WAITLIST_ROLES.map((value) => (
                      <option key={value} value={value}>
                        {WAITLIST_ROLE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>

                <fieldset className="wl-field">
                  <legend className="wl-label">What do you want from it</legend>
                  <div className="wl-chips">
                    {WAITLIST_INTERESTS.map((value) => (
                      <label key={value} className="wl-chip">
                        <input
                          type="checkbox"
                          checked={interests.includes(value)}
                          disabled={done}
                          onChange={() => toggleInterest(value)}
                        />
                        <span>{WAITLIST_INTEREST_LABELS[value]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {variant === "full" && (
                  <div className="wl-field">
                    <label className="wl-label" htmlFor={`${uid}-note`}>
                      Anything we should know <span className="wl-optional">optional</span>
                    </label>
                    <textarea
                      id={`${uid}-note`}
                      rows={3}
                      disabled={done}
                      placeholder="A boat you are trying to move, something that went wrong buying second-hand, a feature you would need."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <p className="wl-hint">
                      We read every one of these. Early answers decide what gets built
                      first.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {errors.form && <p className="wl-error">{errors.form}</p>}

            <p className="wl-smallprint">
              One address, used to tell you when the market opens and nothing else. No
              selling it on, no sharing it, one click to leave from any email we send.
            </p>
          </form>
        </div>

        {/* ---------------- Back: the confirmation ---------------- */}
        <div className="wl-face wl-face-back" aria-hidden={!done}>
          <Water />
          <div className="wl-confirm" role="status" aria-live="polite">
            <CrossingBoat />

            <p className="wl-confirm-kicker">
              {result?.existing ? "We had you already" : "You are on the list"}
            </p>

            {counted !== null ? (
              <p className="wl-number">
                <span className="wl-number-hash" aria-hidden="true">
                  #
                </span>
                {counted}
              </p>
            ) : (
              <h3 className="wl-confirm-title">
                {result?.existing
                  ? "Your answers are updated."
                  : "That is you signed up."}
              </h3>
            )}

            {counted !== null && <p className="wl-confirm-title-sub">in the queue</p>}

            <p className="wl-confirm-body">
              {result?.emailed
                ? "A confirmation is on its way. If it is not there in a few minutes, look in spam and mark it as safe — that is the only way the launch email reaches you."
                : "You are saved on the list. Our confirmation email did not go out just now, but that does not affect your place."}
            </p>

            <button
              type="button"
              className="wl-again"
              onClick={() => {
                setState("idle");
                setEmail("");
                setName("");
                setNote("");
                setResult(null);
              }}
            >
              Add someone else
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
