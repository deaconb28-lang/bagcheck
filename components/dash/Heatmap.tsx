import { heatGroups, heatStrength, heatTiles } from "@/lib/heatmap";
import type { HeatGroupItem, HeatItem } from "@/lib/heatmap";
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
  grouped = false,
}: {
  items: HeatItem[] | HeatGroupItem[];
  /**
   * Nest the map one level, by the provider's industry.
   *
   * The reason to nest rather than colour by theme is the reason this map
   * replaced a pie at all — hue here means money, and a second meaning laid
   * over it is exactly the exemption that was withdrawn. Area says how much,
   * adjacency says which, and nothing has to be spent on a third channel.
   */
  grouped?: boolean;
  /** The hero's version: a square instead of 16:10. What each tile says is
   *  decided by the tile's own pixels, so there is nothing else to pass down. */
  compact?: boolean;
}) {
  const groups = grouped
    ? heatGroups(items as HeatGroupItem[]).filter((group) => group.tiles.length)
    : [];
  const tiles = grouped ? groups.flatMap((group) => group.tiles) : heatTiles(items);
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
      {/*
        * The theme frames, behind every tile.
        *
        * They are drawn as a frame and a chip rather than a fill: a filled
        * band per theme would put eight coloured surfaces under a map whose
        * whole reading is two, and the tiles inside are already carrying the
        * colour that means something.
        */}
      {groups.map((group) => (
        <div
          key={group.label}
          className={styles.group}
          style={{
            left: `${group.box.x}%`,
            top: `${group.box.y}%`,
            width: `${group.box.w}%`,
            height: `${group.box.h}%`,
          }}
          aria-hidden="true"
        >
          <span className={styles.groupLabel}>{group.label}</span>
        </div>
      ))}

      {tiles.map((tile, i) => {
        const dir = tile.pnlPct == null ? "flat" : tile.pnlPct >= 0 ? "up" : "down";
        /*
         * How much a tile can say is not decided here. It used to be — a
         * threshold on the tile's share of the box — and that reading is
         * wrong at the root, because a point of width and a point of height
         * are different lengths on any map that is not square. The tile is a
         * container query container and asks itself, in pixels; see the table
         * in `heatmap.module.css`.
         */
        return (
          <div
            key={tile.symbol}
            className={styles.tile}
            data-dir={dir}
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
            {/*
              * ── The podium ──
              *
              * The top three by weight wear their standing as a numeral, which
              * is the same device the race uses and the same reason: rank is a
              * fact, and a fact stated in type survives a reader who cannot
              * separate two greens. It also turns "here is my book" into
              * "here is my leaderboard", which is the whole of the
              * gamification and costs no invented figure to do.
              *
              * Three, not all of them. A numeral on every tile is a table.
              */}
            {i < 3 ? (
              <span className={`num ${styles.rank}`} aria-hidden="true">
                {i + 1}
              </span>
            ) : null}

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
