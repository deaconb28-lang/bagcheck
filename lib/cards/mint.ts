/**
 * The receipt strip under a card's number.
 *
 * Derived from the slug so the OpenGraph image and the public page draw
 * exactly the same forty-eight cells without either re-reading the ledger —
 * two renders of one card must never disagree about its own receipt.
 */
export function stripCells(slug: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const cells: number[] = [];
  for (let i = 0; i < 48; i += 1) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h ^= h >>> 13;
    const v = (h >>> 0) / 4294967295;
    cells.push(v > 0.82 ? 2 : v > 0.34 ? 1 : 0);
  }
  return cells;
}
