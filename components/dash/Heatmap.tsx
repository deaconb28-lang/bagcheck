import { heatStrength, heatTiles } from "@/lib/heatmap";
import type { HeatItem } from "@/lib/heatmap";
import styles from "./heatmap.module.css";

/**
 * ── The book, as a map ──
 *
 * Replaces the allocation ring. A pie needs a colour per slice, which is
 * precisely what a palette of five hues with one meaning each does not have —
 * so the ring had to take a ramp of `--signal` and a written exemption to draw
 * "which" in hue at all. A treemap needs no exemption: **area** says how much
 * of the account is riding on a name and **order** says which, so hue is free
 * to go back to meaning what it means everywhere else in this product, which
 * is money up and money down.
 *
 * Every reading is stated three ways, which is what makes it accessible rather
 * than pretty: the size of the tile, the figures set in type inside it, and the
 * fill. Nothing here is carried by colour alone.
 *
 * It is also the most shareable object on the screen, and that is not an
 * accident — a heatmap of somebody's own book is the one chart people
 * screenshot without being asked.
 */
export function Heatmap({
  items,
  compact = false,
}: {
  items: HeatItem[];
  /** The hero's version: tiles, no figures under about 9% of the box. */
  compact?: boolean;
}) {
  const tiles = heatTiles(items);
  if (!tiles.length) return null;

  const label = tiles
    .map(
      (t) =>
        `${t.symbol} ${Math.round(t.weight * 100)}%${
          t.pnlPct == null ? "" : `, ${t.pnlPct >= 0 ? "up" : "down"} ${Math.abs(t.pnlPct).toFixed(1)}%`
        }`,
    )
    .join("; ");

  return (
    <div
      className={styles.map}
      data-compact={compact || undefined}
      role="img"
      aria-label={`Holdings by share of the book: ${label}`}
    >
      {tiles.map((tile, i) => {
        const dir = tile.pnlPct == null ? "flat" : tile.pnlPct >= 0 ? "up" : "down";
        /*
         * How much a tile can say is decided by its **narrowest** side, not by
         * its area. A tall sliver and a square can hold the same area and only
         * one of them fits "TSLA" and a percentage on two lines — gating on
         * area alone put a clipped ticker in every narrow tile on the hero's
         * 210px map.
         */
        const narrow = Math.min(tile.w, tile.h);
        return (
          <div
            key={tile.symbol}
            className={styles.tile}
            data-dir={dir}
            data-room={narrow >= 22 && tile.w >= 26 ? "full" : narrow >= 13 && tile.w >= 17 ? "tight" : "none"}
            style={{
              left: `${tile.x}%`,
              top: `${tile.y}%`,
              width: `${tile.w}%`,
              height: `${tile.h}%`,
              /*
               * The lit amount is the return's magnitude against a cap, so a
               * 4% name and a 40% name are visibly different and a 400% name
               * does not flatten everything else to the same green.
               */
              "--lit": heatStrength(tile.pnlPct),
              /* Largest first, capped, so a long book still lands inside 300ms. */
              animationDelay: `${Math.min(i * 26, 300)}ms`,
            } as React.CSSProperties}
          >
            <span className={styles.inner}>
              <span className={styles.symbol}>{tile.symbol}</span>
              <span className={`num ${styles.pct}`}>
                {tile.pnlPct == null
                  ? "—"
                  : `${tile.pnlPct >= 0 ? "+" : "−"}${Math.abs(tile.pnlPct).toFixed(1)}%`}
              </span>
              <span className={`num ${styles.weight}`}>{Math.round(tile.weight * 100)}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
