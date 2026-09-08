import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The single place BoatXchange talks to a language model.
 *
 * Every AI call in the product goes through `getConciergeProvider().stream()`.
 * No page, component or route handler imports an SDK directly, so changing model
 * or provider is a change to this file and an environment variable, the chat UI,
 * the retrieval step and the API route are all unaware of which model answered.
 *
 * ── Model choice ─────────────────────────────────────────────────────────────
 * Default: Claude Haiku 4.5 (`claude-haiku-4-5`), $1 / $5 per million input /
 * output tokens, the cheapest current Claude model.
 *
 * The reasoning is about the shape of the job, not brand loyalty. By the time
 * the model is called, the hard part is already done: `concierge.ts` has turned
 * the conversation into a database query and pulled a short, exact set of real
 * listings. What is left is reading a dozen structured records, matching them
 * against a stated weight, budget and use case, and explaining the trade-off in
 * a few sentences. That is a summarisation-and-explanation task on a small,
 * fully supplied context. A frontier model does it no better, and at roughly
 * five times the price per conversation.
 *
 * At ~3k input and ~400 output tokens a turn, that is about half a US cent per
 * exchange. A concierge session of ten turns costs about five cents. On a
 * frontier model the same session runs 20-30x that, for an answer the buyer
 * could not tell apart.
 *
 * Swapping it: set CONCIERGE_MODEL to any other Claude model id and nothing else
 * changes. Moving to a different vendor entirely means adding one adapter below
 * that satisfies `ConciergeProvider` and pointing CONCIERGE_PROVIDER at it.
 */

export interface ConciergeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConciergeRequest {
  system: string;
  messages: ConciergeMessage[];
  maxTokens?: number;
}

export interface ConciergeProvider {
  /** Identifier shown in the UI so it is never a mystery what answered. */
  id: string;
  model: string;
  /** True when responses come from a real model rather than the offline stub. */
  live: boolean;
  stream(request: ConciergeRequest): AsyncIterable<string>;
}

export const DEFAULT_MODEL = "claude-haiku-4-5";

/**
 * A capped output length is a deliberate cost control, not an oversight. The
 * concierge's job is a recommendation with reasons, not an essay; 1,200 tokens
 * is more than any useful answer here has needed, and it puts a hard ceiling on
 * what a single abusive request can cost.
 */
const MAX_TOKENS = 1200;

class AnthropicProvider implements ConciergeProvider {
  readonly id = "anthropic";
  readonly live = true;
  readonly model: string;
  #client: Anthropic;

  constructor(model: string, apiKey: string) {
    this.model = model;
    this.#client = new Anthropic({ apiKey });
  }

  async *stream(request: ConciergeRequest): AsyncIterable<string> {
    const stream = this.#client.messages.stream({
      model: this.model,
      max_tokens: request.maxTokens ?? MAX_TOKENS,
      system: request.system,
      messages: request.messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }
}

/**
 * Offline stub. Runs when no API key is configured, so a fresh clone, a CI run
 * and a preview deploy all have a working concierge page instead of an error.
 * It is deliberately dumb, it reads the shortlist that retrieval already built
 * and reads it back with the numbers filled in. Every listing it names is real,
 * because it can only name listings from that shortlist.
 */
class EchoProvider implements ConciergeProvider {
  readonly id = "echo";
  readonly live = false;
  readonly model = "offline-stub";

  async *stream(request: ConciergeRequest): AsyncIterable<string> {
    const last = [...request.messages].reverse().find((m) => m.role === "user");
    const shortlist = extractShortlist(last?.content ?? "");

    const opening = shortlist.length
      ? `No model is configured, so this is the shortlist retrieval built from the live inventory, without a model's commentary on top.\n\n`
      : `No model is configured, and nothing in the current inventory matched those constraints closely enough to shortlist.\n\n`;

    const body = shortlist
      .map((line, i) => `**${i + 1}.** ${line}\n`)
      .join("\n");

    const closing = shortlist.length
      ? `\nSet \`ANTHROPIC_API_KEY\` in your environment and the concierge will compare these properly, weight band against your weight, price against your budget, and what each trade-off actually costs you on the water.`
      : `\nTry widening the budget or the region, or browse the [market](/market) directly.`;

    for (const chunk of chunkText(opening + body + closing)) {
      yield chunk;
      await new Promise((r) => setTimeout(r, 12));
    }
  }
}

/** Pulls the `- [bx-1001] …` lines that `concierge.ts` puts in the user turn. */
function extractShortlist(prompt: string): string[] {
  return prompt
    .split("\n")
    .filter((line) => /^- \[bx-/.test(line.trim()))
    .slice(0, 3)
    .map((line) => line.trim().replace(/^- /, ""));
}

function* chunkText(text: string): Generator<string> {
  const words = text.split(/(\s+)/);
  for (let i = 0; i < words.length; i += 4) yield words.slice(i, i + 4).join("");
}

let cached: ConciergeProvider | null = null;

export function getConciergeProvider(): ConciergeProvider {
  if (cached) return cached;

  const requested = process.env.CONCIERGE_PROVIDER ?? "anthropic";
  const model = process.env.CONCIERGE_MODEL ?? DEFAULT_MODEL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (requested === "anthropic" && apiKey) {
    cached = new AnthropicProvider(model, apiKey);
  } else {
    cached = new EchoProvider();
  }
  return cached;
}
