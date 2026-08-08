// Wrapped — the annual moment. prompt.ts is pure; generate.ts is the only
// caller of OpenAI, and it is only ever reached at mint time.
export { artPrompt, wrappedTail } from "./prompt";
export type { WrappedYear } from "./prompt";
export { generateWrappedArt, isImageGenConfigured } from "./generate";
export type { GeneratedArt } from "./generate";
