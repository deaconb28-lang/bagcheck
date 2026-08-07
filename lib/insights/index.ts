// Prompt builders and response validators for insight copy.
export { fallbackInsight } from "./fallback";
export { generateInsight, isInsightsConfigured } from "./generate";
export { INSIGHT_SCHEMA, SYSTEM_PROMPT, allowedNumbers, buildUserPrompt } from "./prompt";
export type { Insight, InsightFacts, InsightResult, InsightSource } from "./types";
export { validateInsight } from "./validate";
export type { ValidationResult } from "./validate";
