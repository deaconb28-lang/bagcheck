// The Health score — pure functions only, no I/O.
export { WEEK_BANDS, inferBaseline, tradesPerWeek } from "./baseline";
export { adherence, consistency, exposure, patience } from "./components";
export { buildRoundTrips } from "./fifo";
export { computeScore } from "./score";
export { AGE_CEIL, AGE_FLOOR, investorAge } from "./age";
export { activeStreaks, disciplineSegments, scoreBand, selfPercentile } from "./shape";
export type { DayShape, ScoredDay, Streak } from "./shape";
export { contributorTone } from "./types";
export type {
  Contributor,
  ContributorTone,
  RoundTrip,
  ScoreComponents,
  ScoreInput,
  ScoreResult,
  StyleBaseline,
  TxnLite,
} from "./types";
