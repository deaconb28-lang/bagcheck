import Anthropic from "@anthropic-ai/sdk";
import { fallbackInsight } from "./fallback";
import { INSIGHT_SCHEMA, SYSTEM_PROMPT, allowedNumbers, buildUserPrompt } from "./prompt";
import type { InsightFacts, InsightResult } from "./types";
import { validateInsight } from "./validate";

/*
 * Sonnet 5, not Opus. Two constrained lines drawn from a fact pack that is
 * already computed is not a reasoning problem — the score is arithmetic and
 * the validator is the real quality gate. Opus cost 66% more per call for
 * copy that `validateInsight` accepts or rejects identically.
 *
 * Not cached, deliberately. SYSTEM_PROMPT is ~1.3k characters, which is
 * roughly 450 tokens on Sonnet 5's tokenizer — below the 1024-token minimum
 * cacheable prefix for this model. A `cache_control` marker here would not
 * error; it would silently do nothing (`cache_creation_input_tokens: 0`).
 * Padding the prompt to reach the floor would cost more than it saves.
 */
const MODEL = "claude-sonnet-5";

// Adaptive thinking is on by default on this model and shares the budget with
// the response, so leave headroom even though the output is two short lines.
// Sonnet 5's tokenizer also runs ~30% longer than the previous generation's.
const MAX_TOKENS = 4000;

let cached: Anthropic | null = null;

export function isInsightsConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!cached) {
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cached;
}

/**
 * Draft the daily readout with Claude, then hold it to the copy rules.
 * The score itself is never model-derived — only the prose is. Any failure,
 * refusal, or rule break falls back to the deterministic readout.
 */
export async function generateInsight(facts: InsightFacts): Promise<InsightResult> {
  if (!isInsightsConfigured()) {
    return fallbackInsight(facts);
  }

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      /*
       * Short, tightly constrained writing — depth buys nothing here, and
       * Sonnet 5 honours `low` strictly rather than going beyond the brief,
       * which is exactly what this prompt wants.
       */
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: INSIGHT_SCHEMA },
      },
      /*
       * No server-side refusal fallback. The decline path already lands
       * somewhere useful — `fallbackInsight` is the deterministic readout the
       * whole feature is designed to degrade to — and the beta's model
       * allowlist is documented against Opus 5, so pairing it with Sonnet 5
       * risks 400-ing every request and silently taking every user to that
       * same fallback by a worse route.
       */
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(facts) }],
    });

    if (response.stop_reason === "refusal") {
      return fallbackInsight(facts, "the request was declined");
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text.trim()) {
      return fallbackInsight(facts, "empty response");
    }

    const draft = JSON.parse(text) as { sentence?: string; tail?: string };
    const insight = {
      sentence: (draft.sentence ?? "").trim(),
      tail: (draft.tail ?? "").trim(),
    };

    const verdict = validateInsight(insight, allowedNumbers(facts));
    if (!verdict.ok) {
      console.warn("[insights] draft rejected:", verdict.reason);
      return fallbackInsight(facts, verdict.reason);
    }

    return { ...insight, source: "model" };
  } catch (err) {
    console.error("[insights] generation failed", err);
    return fallbackInsight(
      facts,
      err instanceof Error ? err.message : "generation failed",
    );
  }
}
