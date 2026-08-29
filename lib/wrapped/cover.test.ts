import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { earnedCards } from "./stats";
import { CARDS } from "../../wrapped/cards.mjs";

type Card = { no: string; key: string; tokens: string[] };
const cards = CARDS as unknown as Card[];

/**
 * The cover is the one card every connected reader should own.
 *
 * A card earns only when *every* token it needs resolves to a non-empty
 * string, and the cover's tokens are USER_NAME and YEAR. Its hero is the
 * year; the name appears exactly once, in "For ___" at the foot — so the card
 * was gated on a decoration. Any account whose name lookup came back empty
 * earned nothing at all, the deck fell back to the example one, and the
 * dashboard reported "0 of 12" to a reader with a perfectly good ledger.
 */
test("USER_NAME always resolves, so the cover can always earn", () => {
  const src = readFileSync("lib/wrapped/stats.ts", "utf8");
  assert.match(
    src,
    /USER_NAME:\s*input\.name\?\.trim\(\)\s*\|\|\s*"you"/,
    "USER_NAME must not be able to come back null",
  );
});

test("the cover earns on a year and a name alone", () => {
  const stats = { USER_NAME: "you", YEAR: "2026" } as Record<string, string>;
  const earned = earnedCards(cards, stats as never);
  assert.ok(
    earned.some((c) => c.key === "cover"),
    "a reader with nothing but a connected account still gets the cover",
  );
});

test("a card whose tokens are missing still does not earn", () => {
  /* The fix must not turn the gate off — only stop it catching the cover on
     a decoration. Everything that needs a real measurement still waits. */
  const stats = { USER_NAME: "you", YEAR: "2026" } as Record<string, string>;
  const earned = earnedCards(cards, stats as never).map((c) => c.key);
  assert.ok(!earned.includes("best"), "a best trade needs a best trade");
  assert.ok(!earned.includes("archetype"));
});
