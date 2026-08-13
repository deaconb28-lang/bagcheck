// Layer 5 — share cards.
//
// `kinds.ts` is the source of truth for what a card is: the twelve, their
// sample floors, their rarity rules, their layouts and the four quantities
// that shape their art. Everything here is pure.
export { buildCards, cardOfKind } from "./kinds";
export type { CardBody, CardHue, CardKind, CardLayout, CardSpec } from "./kinds";
export { ROSTER, deckFrames, earnedCount, firstEarned } from "./roster";
export type { Frame, RosterEntry } from "./roster";
export { stripCells } from "./mint";
export type { StoredCard } from "./types";
export { shareTargets, shareText, imageUrl, downloadName, FORMAT_SIZE } from "./share";
export type { ShareFormat, ShareTarget } from "./share";
