import Anthropic from "@anthropic-ai/sdk";
import { fallbackInsight } from "./fallback";
import { INSIGHT_SCHEMA, SYSTEM_PROMPT, allowedNumbers, buildUserPrompt } from "./prompt";
import type { InsightFacts, InsightResult } from "./types";
import { validateInsight } from "./validate";

const MODEL = "claude-opus-5";

// Thinking is on by default on this model and shares the budget with the
// response, so leave headroom even though the output is two short lines.
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
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Short, tightly constrained writing — depth buys nothing here.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: INSIGHT_SCHEMA },
      },
      // Route a safety decline to another model rather than losing the turn.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(facts) }],
    });

    if (response.stop_reason === "refusal") {
      return fallbackInsight(facts, "the request was declined");
    }

    const text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
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
