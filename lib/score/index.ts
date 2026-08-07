// Discipline score — pure functions only, no I/O.
export { WEEK_BANDS, inferBaseline, tradesPerWeek } from "./baseline";
export { adherence, consistency, exposure, patience } from "./components";
export { buildRoundTrips } from "./fifo";
export { computeScore } from "./score";
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
