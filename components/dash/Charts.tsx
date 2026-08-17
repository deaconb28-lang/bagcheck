import { Logo } from "@/components/primitives";
import type { Session } from "@/lib/portfolio/types";
import styles from "./charts.module.css";

/**
 * The dashboard's chart idioms. Server components, SVG and CSS only, no
 * charting dependency, and every one of them draws its finished state without
 * JavaScript — the animations are `from`-only so the static render is the
 * design rather than a frame of it.
 */

/* ── Daily realised P&L, as columns off a zero line ─────────────────────── */

/**
 * **Saturation is the data.** Ordinary sessions sit back at a fraction of the
 * hue and only the largest moves in the window take it at full strength. A
 * chart where every column is fully saturated is a chart where colour has
 * stopped carrying information.
 *
 * The zero line is drawn once, across the middle, and columns hang off it both
 * ways — so a losing session reads as below the line rather than as a
 * differently coloured bar of the same height.
 */
export function PnlColumns({ sessions, peak }: { sessions: Session[]; peak: number }) {
  if (!sessions.length) return null;

  /* Full strength for the top fifth of moves; everything else sits back. */
  const strongAt = peak * 0.62;

  return (
    <div className={styles.columns} role="img" aria-label={`Realised P&L across ${sessions.length} sessions`}>
      <span className={styles.zero} aria-hidden="true" />
      {sessions.map((session, i) => {
        const share = Math.min(Math.abs(session.amount) / peak, 1) * 100;
        const up = session.amount >= 0;
        const strong = Math.abs(session.amount) >= strongAt;
        const delay = `${Math.min(i * 16, 704)}ms`;
        return (
          <span key={`${session.date}-${i}`} className={styles.column}>
            <span className={styles.upHalf}>
              {up ? (
                <i
                  className={styles.up}
                  data-strong={strong || undefined}
                  style={{ height: `${share}%`, animationDelay: delay }}
                />
              ) : null}
            </span>
            <span className={styles.downHalf}>
              {up ? null : (
                <i
                  className={styles.down}
                  data-strong={strong || undefined}
                  style={{ height: `${share}%`, animationDelay: delay }}
                />
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function ChartAxis({ labels }: { labels: string[] }) {
  return (
    <div className={styles.axis}>
      {labels.map((label, i) => (
        <span key={`${label}-${i}`}>{label}</span>
      ))}
    </div>
  );
}

export function Legend({ up, down }: { up: number; down: number }) {
  return (
    <div className={styles.legend}>
      <span className={styles.legendItem}>
        <i className={styles.swatchUp} aria-hidden="true" />
        {up} up {up === 1 ? "day" : "days"}
      </span>
      <span className={styles.legendItem}>
        <i className={styles.swatchDown} aria-hidden="true" />
        {down} down {down === 1 ? "day" : "days"}
      </span>
    </div>
  );
}

/* ── Allocation, as a donut ─────────────────────────────────────────────── */

export interface Slice {
  key: string;
  label: string;
  value: number;
}

/**
 * A hue per holding, and this is the one chart allowed them.
 *
 * Everywhere else in the product a hue means one thing and never variety. A
 * part-to-whole chart is the exception the rule has to make: with no colour
 * per slice there is nothing to tie an arc to its row, and a ramp of one hue
 * across seven names is a chart nobody can read at a glance. The palette is
 * fixed and ordered by weight, so the biggest name is always violet and the
 * remainder is always the neutral — the colours identify, they never grade.
 *
 * Segments are dashed strokes on one circle with `pathLength="100"`, so a dash
 * unit is a percentage point and there is no arc arithmetic to get wrong.
 */
const WEDGES = ["--wedge-1", "--wedge-2", "--wedge-3", "--wedge-4", "--wedge-5"];
const NAMED = 5;
/** Under this a slice is a hairline that reads as a rendering artefact. */
const FLOOR = 0.03;

export function AllocationDonut({ slices, size = 184 }: { slices: Slice[]; size?: number }) {
  const priced = slices
    .filter((slice) => Number.isFinite(slice.value) && slice.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = priced.reduce((sum, slice) => sum + slice.value, 0);
  if (priced.length < 2 || total <= 0) return null;

  const big = priced.filter((slice) => slice.value / total >= FLOOR);
  let head = big.slice(0, NAMED);
  let tail = priced.filter((slice) => !head.includes(slice));
  /* "Rest · 1 position" is a mislabel, so the last one comes back out. */
  if (tail.length === 1) {
    head = [...head, tail[0]];
    tail = [];
  }
  const rest = tail.reduce((sum, slice) => sum + slice.value, 0);

  const rows = [
    ...head.map((slice, i) => ({
      key: slice.key,
      label: slice.label,
      share: slice.value / total,
      paint: `var(${WEDGES[Math.min(i, WEDGES.length - 1)]})`,
    })),
    ...(rest > 0
      ? [{ key: "__rest", label: `${tail.length} more`, share: rest / total, paint: "var(--wedge-rest)" }]
      : []),
  ];

  /* A uniform notch between arcs, baked into the offsets rather than the dash. */
  const GAP = 0.85;
  let start = 0;

  return (
    <div className={styles.donutWrap}>
      <div className={styles.donut} style={{ "--size": `${size}px` } as React.CSSProperties}>
        <svg viewBox="0 0 100 100" className={styles.donutSvg} aria-hidden="true">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--track)" strokeWidth="14" />
          {rows.map((row, i) => {
            const pct = row.share * 100;
            const dash = Math.max(pct - GAP, Math.min(0.4, pct));
            const offset = -(start + GAP / 2);
            start += pct;
            return (
              <circle
                key={row.key}
                className={styles.wedge}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                pathLength={100}
                stroke={row.paint}
                strokeWidth="14"
                strokeLinecap="butt"
                strokeDasharray={`${dash.toFixed(3)} ${(100 - dash).toFixed(3)}`}
                strokeDashoffset={offset.toFixed(3)}
                style={{ animationDelay: `${100 + i * 140}ms` }}
              />
            );
          })}
        </svg>
        <div className={styles.donutCentre}>
          <span className={styles.donutCount}>
            {priced.length} {priced.length === 1 ? "holding" : "holdings"}
          </span>
          <span className={styles.donutTail} data-tone={rows[0].share >= 0.4 ? "loss" : undefined}>
            {rows[0].share >= 0.4 ? "Concentrated" : "Spread"}
          </span>
        </div>
      </div>

      <dl className={styles.donutLegend}>
        {rows.map((row) => (
          <div key={row.key} className={styles.donutRow}>
            <span className={styles.wedgeSwatch} style={{ background: row.paint }} aria-hidden="true" />
            {/*
              * The company's mark, on the one screen that names holdings and
              * had none.
              *
              * Always a slot, never a conditional child: this legend is a grid
              * with a column per part, and a row that skipped the mark would
              * slide its name and its share one column left. `__rest` is an
              * aggregate of several companies rather than one, so it holds an
              * empty slot — a mark there would be one arbitrary member of the
              * group standing for all of them — and `Logo` itself renders
              * nothing for a symbol it cannot normalise.
              */}
            <span className={styles.wedgeMark} aria-hidden="true">
              {row.key === "__rest" ? null : <Logo symbol={row.key} size={22} />}
            </span>
            <dt className={styles.wedgeName}>{row.label}</dt>
            <dd className={`num ${styles.wedgeShare}`}>
              {row.share * 100 < 1 ? "<1" : (row.share * 100).toFixed(0)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── The small thumbnails an insight row carries ────────────────────────── */

/** Realised P&L by weekday. The worst day is the only red column. */
export function WeekdayBars({
  cells,
  worst,
}: {
  cells: Array<{ day: string; amount: number }>;
  worst: string | null;
}) {
  const peak = Math.max(...cells.map((cell) => Math.abs(cell.amount)), 1);
  return (
    <div className={styles.weekday}>
      {cells.map((cell, i) => {
        const bad = cell.day === worst;
        return (
          <span key={cell.day} className={styles.weekdayCol}>
            <span className={styles.weekdayPlot}>
              <i
                className={styles.weekdayBar}
                data-bad={bad || undefined}
                style={{
                  height: `${Math.max((Math.abs(cell.amount) / peak) * 100, 6)}%`,
                  animationDelay: `${50 + i * 60}ms`,
                }}
              />
            </span>
            <span className={styles.weekdayLabel} data-bad={bad || undefined}>
              {cell.day.slice(0, 1)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Two meters: how long winners are held against how long losers are. */
export function HoldMeters({
  winners,
  losers,
  compact,
}: {
  winners: number;
  losers: number;
  compact?: boolean;
}) {
  const longest = Math.max(winners, losers, 1);
  return (
    <div className={styles.holds} data-compact={compact || undefined}>
      <div>
        <div className={styles.holdHead}>
          <span>Winners held</span>
          <span className={`num ${styles.holdWin}`}>{Math.round(winners)} days</span>
        </div>
        <span className={styles.holdTrack}>
          <i
            className={styles.holdWinFill}
            style={{ width: `${(winners / longest) * 100}%`, animationDelay: "100ms" }}
          />
        </span>
      </div>
      <div>
        <div className={styles.holdHead}>
          <span>Losers held</span>
          <span className={`num ${styles.holdLoss}`}>{Math.round(losers)} days</span>
        </div>
        <span className={styles.holdTrack}>
          <i
            className={styles.holdLossFill}
            style={{ width: `${(losers / longest) * 100}%`, animationDelay: "240ms" }}
          />
        </span>
      </div>
    </div>
  );
}

/** A 45-day line, drawn once per holding row. Never filled. */
export function Sparkline({ series, up }: { series: number[]; up: boolean }) {
  if (series.length < 2) return null;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = hi - lo || 1;
  const points = series
    .map((value, i) => {
      const x = (i / (series.length - 1)) * 90;
      const y = 27 - ((value - lo) / span) * 24;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" L");

  return (
    <svg viewBox="0 0 90 30" className={styles.spark} preserveAspectRatio="none" aria-hidden="true">
      <path
        d={`M${points}`}
        fill="none"
        stroke={up ? "var(--moss)" : "var(--loss)"}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ── The book, position by position ─────────────────────────────────────── */

export interface PositionRow {
  symbol: string;
  value: number;
  pnl: number | null;
  pnlPct: number | null;
}

/**
 * What each holding is up or down, unrealised.
 *
 * The daily realised chart is the largest panel on the dashboard and it is
 * empty until the reader has *sold* something — so an account that connected
 * this week, or one that only ever buys, gets half a screen of nothing while
 * its eight positions sit priced and unread two panels over. This is what that
 * space holds instead. It needs no round trips, no equity history and no
 * derived document: one synced snapshot answers it.
 *
 * Bars run both ways off a shared left edge rather than a centre line, because
 * these are not sessions in time — they are a ranked list, and a zero line
 * would imply an ordering the rows do not have. Length is the *size* of the
 * move against the largest in the book; the hue and the sign carry direction.
 *
 * A position whose P&L nothing can answer for — no cost basis, no broker
 * figure — states the dash rather than drawing a bar at zero, which would read
 * as flat rather than as unknown.
 */
export function HoldingBars({ rows, money }: { rows: PositionRow[]; money: (n: number) => string }) {
  const answerable = rows.filter((row) => row.pnl != null);
  if (!answerable.length) return null;

  const peak = Math.max(...answerable.map((row) => Math.abs(row.pnl ?? 0)), 1);

  return (
    <ul className={styles.bookList}>
      {rows.slice(0, 8).map((row, i) => {
        const up = (row.pnl ?? 0) >= 0;
        const share = row.pnl == null ? 0 : (Math.abs(row.pnl) / peak) * 100;
        return (
          <li key={row.symbol} className={styles.bookRow}>
            <span className={styles.bookMark} aria-hidden="true">
              <Logo symbol={row.symbol} size={22} />
            </span>
            <span className={styles.bookName}>{row.symbol}</span>
            <span className={styles.bookTrack}>
              {row.pnl == null ? null : (
                <i
                  className={styles.bookBar}
                  data-tone={up ? "moss" : "loss"}
                  style={{ width: `${share}%`, animationDelay: `${60 + i * 70}ms` }}
                />
              )}
            </span>
            <span className={`num ${styles.bookPnl}`} data-tone={row.pnl == null ? undefined : up ? "moss" : "loss"}>
              {row.pnl == null ? "—" : money(row.pnl)}
            </span>
            <span className={`num ${styles.bookPct}`}>
              {row.pnlPct == null ? "" : `${row.pnlPct >= 0 ? "+" : "−"}${Math.abs(row.pnlPct).toFixed(1)}%`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── The book by industry ───────────────────────────────────────────────── */

/**
 * Where the money sits by *kind of thing*, under the ring that says by name.
 *
 * Five positions spread evenly is not spread at all if four of them are
 * semiconductors, and the allocation ring cannot see that — it answers "which
 * names", which is the question a reader already knows the answer to. This is
 * the grain that actually carries the risk.
 *
 * One stacked bar rather than a second donut: two rings on one panel is two
 * things to decode, and a part-to-whole across three or four buckets reads
 * better as a line than as a circle. It takes the same fixed weight ramp the
 * ring does, so the largest sector wears the same paint as the largest name
 * and the two idioms agree about what "biggest" looks like.
 *
 * `cover` is stated rather than hidden. A holding whose sector nothing can name
 * is left out entirely — "Other 38%" would be a statement about our data
 * coverage wearing the costume of a statement about the reader's portfolio.
 */
export function SectorMix({
  sectors,
  cover,
}: {
  sectors: Array<{ name: string; value: number; share: number }>;
  cover: number;
}) {
  if (sectors.length < 2) return null;
  const shown = sectors.slice(0, 5);

  return (
    <div className={styles.sectors}>
      <div className={styles.sectorBar} role="img" aria-label="Book by industry">
        {shown.map((sector, i) => (
          <i
            key={sector.name}
            className={styles.sectorSeg}
            style={{
              width: `${sector.share * 100}%`,
              background: `var(${WEDGES[Math.min(i, WEDGES.length - 1)]})`,
              animationDelay: `${120 + i * 90}ms`,
            }}
          />
        ))}
      </div>
      <dl className={styles.sectorLegend}>
        {shown.map((sector, i) => (
          <div key={sector.name} className={styles.sectorRow}>
            <span
              className={styles.wedgeSwatch}
              style={{ background: `var(${WEDGES[Math.min(i, WEDGES.length - 1)]})` }}
              aria-hidden="true"
            />
            <dt className={styles.sectorName}>{sector.name}</dt>
            <dd className={`num ${styles.sectorShare}`}>
              {sector.share * 100 < 1 ? "<1" : (sector.share * 100).toFixed(0)}%
            </dd>
          </div>
        ))}
      </dl>
      {cover < 0.995 ? (
        <p className={styles.sectorNote}>
          Across the {(cover * 100).toFixed(0)}% of your book your brokerage names a sector for.
        </p>
      ) : null}
    </div>
  );
}
