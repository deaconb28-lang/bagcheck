// Layer 4 — correlations over the ledger. Pure functions, no I/O.
export { entryHour, exitSpeed, findings, reEntry, sessionSize, whatIsMissing } from "./correlations";
export type { Finding } from "./correlations";
export {
  byConviction,
  byReason,
  convictionStats,
  joinTags,
  revenge,
  taggedFindings,
  whatTagsAreMissing,
} from "./tagged";
export type { ConvictionStats, TaggedOpen } from "./tagged";
export { sizingAfterLoss, tiltFindings, tradeDrift } from "./tilt";
export { MIN_DEPTH_PCT, drawdownWindows, eventSegments, segmentReading } from "./segments";
export type { EquityPoint, EventWindow } from "./segments";
