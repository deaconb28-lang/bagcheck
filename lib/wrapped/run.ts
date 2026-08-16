import {
  captionIsClean,
  captionOf,
  fallbackCaption,
  fill,
  validate,
} from "./personalise";
import type { WrappedContext, WrappedStats } from "./stats";

/**
 * The one place that asks a model to help finish a card.
 *
 * Two modes, and the difference is worth stating because it is the whole
 * economics of this pipeline.
 *
 * **`caption`** — the default. The model is sent the stats and asked for one
 * sentence. Our code does the substitution. This is what actually ships.
 *
 * **`full`** — the model is sent the whole template and asked to substitute
 * every token *and* write the caption, and the answer is then checked
 * character for character against the same stats it was given.
 *
 * `full` cannot produce a better card than `caption`. The validator only lets
 * a card through when every value equals what `String.replace` would have
 * written, so a passing answer is identical to the deterministic one and a
 * failing answer is thrown away — the model is spending tokens and latency to
 * reproduce a string we already hold. What it can do is fail, at a rate no
 * prompt drives to zero, which is why the fallback exists at all. `caption`
 * keeps the only part a model is genuinely better at and drops the part where
 * it can only break even.
 *
 * `full` stays available because it is what the pipeline was specified as and
 * because its audit log is the evidence for the paragraph above: run it, read
 * the discard rate, and the argument settles itself.
 */

export type ModelMode = "caption" | "full";

export function modelMode(): ModelMode {
  return process.env.WRAPPED_MODEL_MODE === "full" ? "full" : "caption";
}

/**
 * The model. Cheap and small on purpose — this is one short sentence over a
 * few hundred tokens of context, twelve times per reader per year.
 */
function model(): string {
  return process.env.WRAPPED_MODEL || "gpt-5-mini";
}

/** Four at a time, per the pipeline's own limit. */
const CONCURRENCY = 4;

/** Retries on 429 and 5xx. Anything else is the request's fault, not the network's. */
const BACKOFF_MS = [400, 1200, 3600];

export interface CardJob {
  no: string;
  key: string;
  template: string;
  fallbackCaptions: readonly string[];
}

export interface FinishedCard {
  no: string;
  key: string;
  html: string;
  caption: string;
  /** How this card got its caption, for the audit log and the metrics. */
  source: "model" | "fallback";
  /** Why the model's answer was discarded, when it was. */
  discarded: string | null;
}

const SYSTEM_FULL =
  "You fill in a Wrapped card template. You will receive an HTML template and " +
  "a stats JSON object. Replace every {{TOKEN}} in the HTML with the exact " +
  "corresponding string from the JSON — character for character, no " +
  "reformatting, no recomputation. Then write one caption of at most 12 words " +
  "into the {{CAPTION}} slot: second person, warm, celebratory or neutral, " +
  "never advice, never a prediction, never a line that points out something " +
  "the reader did wrong, no trader slang. Change nothing else in the markup — " +
  "no added elements, no removed elements, no altered attributes or styles. " +
  "Return the raw completed HTML only, with no code fences and no commentary.";

const SYSTEM_CAPTION =
  "You write one caption for a Wrapped card. You will receive the card's " +
  "title and a stats JSON object. Write at most 12 words: second person, " +
  "warm, celebratory or neutral, never advice, never a prediction, never a " +
  "line that points out something the reader did wrong, no trader slang, no " +
  "exclamation marks. Do not restate the numbers — they are already set in " +
  "type on the card. Return the caption text only, with no quotes, no code " +
  "fences and no commentary.";

/**
 * Card 10 compares the reader to the index, and being behind it is the one
 * place this product could easily start sounding like a school report.
 */
function toneNote(no: string, context: WrappedContext): string {
  if (no !== "10" || context.aheadOfIndex == null) return "";
  return context.aheadOfIndex
    ? "\n\nThe reader is ahead of the index."
    : "\n\nThe reader is behind the index. If behind, the caption is neutral and " +
        "forward-looking, never apologetic or critical.";
}

async function chat(system: string, user: string, signal?: AbortSignal): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt += 1) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: model(),
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        const wait = BACKOFF_MS[attempt];
        if (wait == null) return null;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) {
        console.error("[wrapped] model refused", res.status, (await res.text()).slice(0, 200));
        return null;
      }

      const body = await res.json();
      const text = body?.choices?.[0]?.message?.content;
      return typeof text === "string" ? text.trim() : null;
    } catch (err) {
      const wait = BACKOFF_MS[attempt];
      if (wait == null) {
        console.error("[wrapped] model unreachable", err);
        return null;
      }
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return null;
}

/**
 * The stats the model is allowed to see for one card.
 *
 * Only the tokens that card carries, never the whole object. A caption for the
 * drawdown card has no business being written with the reader's name and their
 * best ticker in the context window — and the smaller the payload, the less
 * there is to leak, cache or subpoena.
 */
function statsFor(tokens: readonly string[], stats: WrappedStats): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tokens) {
    const v = stats[t];
    if (typeof v === "string" && v) out[t] = v;
  }
  return out;
}

/** Strip a code fence a model added despite being asked not to. */
function unfence(text: string): string {
  return text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
}

/**
 * Finish one card. Never throws, never returns a broken card: every failure
 * path lands on the deterministic fill with a written caption.
 */
export async function finishCard(
  job: CardJob,
  stats: WrappedStats,
  context: WrappedContext,
  tokens: readonly string[],
  seed: string,
  signal?: AbortSignal,
): Promise<FinishedCard> {
  const safe = (caption: string, discarded: string | null): FinishedCard => ({
    no: job.no,
    key: job.key,
    html: fill(job.template, stats, caption),
    caption,
    source: discarded == null ? "model" : "fallback",
    discarded,
  });

  const backup = fallbackCaption(job.fallbackCaptions, `${seed}:${job.no}`);
  const payload = JSON.stringify(statsFor(tokens, stats), null, 2);
  const mode = modelMode();

  const answer = await chat(
    mode === "full" ? SYSTEM_FULL : SYSTEM_CAPTION,
    mode === "full"
      ? `${job.template}\n\n${payload}${toneNote(job.no, context)}`
      : `Card: ${job.key}\n\n${payload}${toneNote(job.no, context)}`,
    signal,
  );

  if (!answer) return safe(backup, "no answer from the model");

  if (mode === "caption") {
    /* A model that wrapped its one sentence in quotes despite being asked not to. */
    const caption = unfence(answer).replace(/^["']([\s\S]*)["']$/, "$1").trim();
    const clean = captionIsClean(caption);
    if (!clean.ok) return safe(backup, `caption rejected — ${clean.reason}`);
    return { ...safe(caption, null), source: "model" };
  }

  /* `full`: trust nothing, check everything, and fall back on any doubt. */
  const html = unfence(answer);
  const verdict = validate(html, job.template, stats);
  if (!verdict.ok) return safe(backup, `${verdict.check} — ${verdict.detail}`);

  const caption = captionOf(html);
  if (!caption) return safe(backup, "no caption in the returned card");
  const clean = captionIsClean(caption);
  if (!clean.ok) return safe(backup, `caption rejected — ${clean.reason}`);

  return { no: job.no, key: job.key, html, caption, source: "model", discarded: null };
}

/** Every card for one reader, four in flight at a time. */
export async function finishCards(
  jobs: CardJob[],
  tokensByCard: Record<string, readonly string[]>,
  stats: WrappedStats,
  context: WrappedContext,
  seed: string,
  signal?: AbortSignal,
): Promise<FinishedCard[]> {
  const out: FinishedCard[] = [];
  let next = 0;

  const worker = async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= jobs.length) return;
      out[i] = await finishCard(
        jobs[i],
        stats,
        context,
        tokensByCard[jobs[i].no] ?? [],
        seed,
        signal,
      );
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()),
  );
  return out;
}
