"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HullArt } from "./HullArt";
import { RichText, type RefTarget } from "./RichText";
import type {
  ConciergeChatMessage, ConciergeEvent, ConciergeListingRef,
} from "@/lib/ai/shared";

interface Turn extends ConciergeChatMessage {
  /** Listings retrieved for this turn, the set the answer had to choose from. */
  shortlist?: ConciergeListingRef[];
  /** Listings the answer actually named. */
  referenced?: string[];
  streaming?: boolean;
  error?: string;
}

const STARTERS = [
  "I'm 78 kg, been sculling two years, want my first single. Budget around £7,000, based in the UK.",
  "Our club needs a second eight for a novice squad. What's out there under $20,000?",
  "I'm 62 kg and want to race masters singles. What fits me?",
  "What's the difference between the coastal boats you have, and would one suit rough estuary water?",
];

export function ConciergeChat({
  pinnedSlug, pinnedTitle,
}: {
  pinnedSlug?: string;
  pinnedTitle?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ model: string; live: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;

    const history: ConciergeChatMessage[] = [
      ...turns.map(({ role, content }) => ({ role, content })),
      { role: "user" as const, content: text },
    ];

    setTurns((t) => [...t, { role: "user", content: text }, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, listing: pinnedSlug ?? null }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? "The concierge is unavailable right now.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // NDJSON: one JSON event per line, so a partial chunk never gets parsed.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ConciergeEvent;
          setTurns((t) => applyEvent(t, event));
          if (event.type === "context") setMeta({ model: event.model, live: event.live });
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      const message = (error as Error).message || "Something went wrong.";
      setTurns((t) => {
        const next = [...t];
        const last = next[next.length - 1];
        if (last?.role === "assistant") next[next.length - 1] = { ...last, streaming: false, error: message };
        return next;
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="concierge">
      <div className="concierge-thread" aria-live="polite" aria-busy={busy}>
        {turns.length === 0 && (
          <div className="concierge-intro">
            <div className="concierge-intro-art" aria-hidden="true">
              <HullArt seed={4821} scene="puddles" ratio={0.42} />
            </div>
            <h2>Tell it what you actually need.</h2>
            <p className="muted">
              Your weight, your budget, how long you have been rowing and what you
              want to do with the boat. The concierge reads the live inventory
              before it answers, so every boat it names is one you can go and buy
              today.
              {pinnedTitle && (
                <>
                  {" "}
                  It already has <strong>{pinnedTitle}</strong> in front of it.
                </>
              )}
            </p>
            <ul className="starters">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => ask(s)} disabled={busy}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <div key={i} className="bubble bubble-user">
              <p className="bubble-who">You</p>
              <p>{turn.content}</p>
            </div>
          ) : (
            <AssistantTurn key={i} turn={turn} />
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        className="concierge-composer"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label className="visually-hidden" htmlFor="concierge-input">
          Describe what you are looking for
        </label>
        <textarea
          id="concierge-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              ask(input);
            }
          }}
          placeholder="I'm 71 kg, rowing four years, want something I can race masters in. About €9,000."
          rows={3}
          maxLength={4000}
          disabled={busy}
        />
        <div className="concierge-composer-foot">
          <p className="tiny muted">
            {meta ? (
              meta.live ? (
                <>Answers grounded in the live inventory · {meta.model}</>
              ) : (
                <>
                  Offline mode, no model configured, so you are seeing raw retrieval
                  results. Set <code>ANTHROPIC_API_KEY</code> to enable the concierge.
                </>
              )
            ) : (
              <>⌘/Ctrl + Enter to send</>
            )}
          </p>
          <button type="submit" className="btn btn-accent" disabled={busy || !input.trim()}>
            {busy ? "Thinking…" : "Ask the concierge"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssistantTurn({ turn }: { turn: Turn }) {
  const shortlist = turn.shortlist ?? [];
  const refs = new Map<string, RefTarget>(
    shortlist.map((l) => [l.id, { id: l.id, slug: l.slug, title: l.title }]),
  );
  const named = shortlist.filter((l) => turn.referenced?.includes(l.id));

  return (
    <div className="bubble bubble-assistant">
      <p className="bubble-who">
        Concierge
        {shortlist.length > 0 && (
          <span className="bubble-grounding" title="Listings retrieved from the live inventory for this answer">
            {shortlist.length} live {shortlist.length === 1 ? "listing" : "listings"} read
          </span>
        )}
      </p>

      {turn.content ? (
        <div className="prose">
          <RichText text={turn.content} refs={refs} />
        </div>
      ) : turn.streaming ? (
        <p className="muted small concierge-thinking">
          <span className="pulse" aria-hidden="true" /> Reading the inventory…
        </p>
      ) : null}

      {turn.error && <p className="field-error">{turn.error}</p>}

      {named.length > 0 && <ReferencedListings listings={named} />}
    </div>
  );
}

/**
 * The boats the answer named, shown as real cards, and as a comparison table
 * when it named two or three, which is the case the concierge is asked to aim
 * for. The table is built from inventory data, not from the model's prose, so
 * the numbers in it are always the listing's own.
 */
function ReferencedListings({ listings }: { listings: ConciergeListingRef[] }) {
  const comparable = listings.length >= 2 && listings.length <= 3;

  return (
    <div className="concierge-refs">
      <h3 className="concierge-refs-title">
        {listings.length === 1 ? "The boat in question" : "Side by side"}
      </h3>

      {comparable ? (
        <div className="table-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Specification</span>
                </th>
                {listings.map((l) => (
                  <th key={l.id} scope="col">
                    <Link href={`/market/${l.slug}`}>{l.title}</Link>
                    <span className="compare-art" aria-hidden="true">
                      <HullArt seed={l.artSeed} category={l.category} ratio={0.5} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS
                // Comparing a unisuit against a cox box should not print four
                // empty hull rows: a row survives only if something in this
                // comparison actually has a value for it.
                .filter(([, get]) => listings.some((l) => get(l) !== null))
                .map(([label, get]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {listings.map((l) => (
                      <td key={l.id}>{get(l) ?? "not stated"}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="concierge-ref-list">
          {listings.map((l) => (
            <li key={l.id}>
              <Link href={`/market/${l.slug}`}>
                <span className="concierge-ref-art" aria-hidden="true">
                  <HullArt seed={l.artSeed} category={l.category} ratio={0.66} />
                </span>
                <span>
                  <strong>{l.title}</strong>
                  <span className="muted small">
                    {l.priceLabel} · {l.location}
                    {l.weightBand ? ` · ${l.weightBand}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Spec rows for the side-by-side table, in the order a buyer scans them. */
const COMPARE_ROWS: [string, (l: ConciergeListingRef) => string | null][] = [
  ["Price", (l) => `${l.priceLabel}${l.priceNote ? ` (${l.priceNote})` : ""}`],
  ["Type", (l) => l.boatClassLabel],
  ["Condition", (l) => l.conditionLabel],
  ["Sizes", (l) => l.sizeRange],
  ["Cut", (l) => l.fitLabel],
  ["Quantity", (l) => l.lotSize],
  ["Crew weight", (l) => l.weightBand],
  ["Hull weight", (l) => (l.hullWeightKg ? `${l.hullWeightKg} kg` : null)],
  ["Material", (l) => l.materialLabel],
  ["Location", (l) => l.location],
  ["Seller", (l) => `${l.sellerLabel}${l.verified ? " · verified" : ""}`],
];

function applyEvent(turns: Turn[], event: ConciergeEvent): Turn[] {
  const next = [...turns];
  const i = next.length - 1;
  const last = next[i];
  if (!last || last.role !== "assistant") return turns;

  switch (event.type) {
    case "context":
      next[i] = { ...last, shortlist: event.listings };
      break;
    case "delta":
      next[i] = { ...last, content: last.content + event.text };
      break;
    case "done":
      next[i] = { ...last, referenced: event.referenced, streaming: false };
      break;
    case "error":
      next[i] = { ...last, error: event.message, streaming: false };
      break;
  }
  return next;
}
