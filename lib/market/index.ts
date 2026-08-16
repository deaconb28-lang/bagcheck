// Finnhub. marks.ts is pure; everything else is cached and rate-limited.
// Quotes correct a stale mark and never become an alert.
export { isMarketConfigured, marketToken } from "./client";
export { quotesFor } from "./quotes";
export { profilesFor } from "./profiles";
export type { CompanyProfile } from "./profiles";
export { earningsFor } from "./earnings";
export type { EarningsDate } from "./earnings";
export { fieldProvenance, isStale, provenanceLine, resolveMark, resolveMarks } from "./marks";
export type { Quote, ResolvedMark, StoredMark } from "./marks";
export { nameRows, refreshHoldings, repriceRows } from "./holdings";
export type { RefreshedHoldings } from "./holdings";
export { BENCHMARK, indexReturnYtd } from "./benchmark";
export { PEERS, peerReturnsYtd } from "./peers";
export type { Peer } from "./peers";
