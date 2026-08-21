import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/auth";
import { accessFor, isDbConfigured, syncClock } from "@/lib/db";
import { dashboardFor } from "@/lib/portfolio/load";
import type { HoldingRow } from "@/lib/db";
import { AppNav } from "@/components/app/AppNav";
import { Paywall } from "@/components/app/Paywall";
import { shellUser } from "@/components/app/shellUser";
import { Logo } from "@/components/primitives";
import {
  Chip,
  Chips,
  Page,
  PageHead,
  Stat,
  Stats,
  money,
  signedMoney,
  signedPct,
} from "@/components/dash/Chrome";
import { Sparkline } from "@/components/dash/Charts";
import { Heatmap } from "@/components/dash/Heatmap";
import styles from "./holdings.module.css";

export const metadata: Metadata = { title: "Holdings" };
export const dynamic = "force-dynamic";

type Sort = "weight" | "pnl" | "account";

const SORTS: Array<{ key: Sort; label: string }> = [
  { key: "weight", label: "By weight" },
  { key: "pnl", label: "By P&L" },
  { key: "account", label: "By name" },
];

/**
 * Every position, with what it cost, what it is worth and what it has done.
 *
 * The one page in the product that is a table and should be. Its sparkline is
 * drawn from the position's own share of the equity curve rather than from a
 * price series we do not hold — it is a shape, and the figures beside it are
 * what anyone reads.
 */
export default async function HoldingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) redirect("/you");

  /* The subscription gate, before the ledger is read. */
  const access = await accessFor(userId);
  if (!access.allowed) return <Paywall trial={access.trial} />;

  const { data, view, facts } = await dashboardFor(userId, "all");
  const { sort: sortParam } = await searchParams;
  const sort: Sort =
    sortParam === "pnl" || sortParam === "account" ? sortParam : "weight";

  /* The book is the view's; this page only chooses an order to read it in. */
  const { book } = view;
  const holdings = [...facts.holdings].sort(compare(sort));
  /* Two of the three sorts are a standing; "by name" is an index. */
  const isStanding = sort === "weight" || sort === "pnl";
  const byValue = [...holdings].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const topTwo = byValue.slice(0, 2).reduce((sum, row) => sum + (row.value ?? 0), 0);
  const accounts = view.accounts;

  /*
   * The best and worst name on file, by return rather than by dollars — a
   * hundred dollars on a small position is a better story than a hundred on a
   * large one, and this strip is about the story. Absent under two priced
   * rows: with one name there are no ends, there is a name.
   */
  const withReturn = holdings.filter((row) => row.pnlPct != null);
  const ranked = [...withReturn].sort((a, b) => (b.pnlPct ?? 0) - (a.pnlPct ?? 0));
  const ends =
    ranked.length >= 2
      ? ([
          { label: "Best on file", row: ranked[0], tone: "moss" },
          { label: "Worst on file", row: ranked[ranked.length - 1], tone: "loss" },
        ] as const)
      : null;

  return (
    <>
      <AppNav
        active="holdings"
        accounts={accounts}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        user={await shellUser()}
      />

      <Page>
        <div data-reveal>
          <PageHead
            eyebrow="Holdings"
            title={`${holdings.length} ${holdings.length === 1 ? "position" : "positions"}${accounts ? `, ${accounts} ${accounts === 1 ? "account" : "accounts"}` : ""}`}
          >
            <Chips>
              {SORTS.map((option) => (
                <Chip
                  key={option.key}
                  href={`/holdings?sort=${option.key}`}
                  active={option.key === sort}
                >
                  {option.label}
                </Chip>
              ))}
            </Chips>
          </PageHead>
        </div>

        <Stats>
          <Stat label="Market value" value={money(book.value)} />
          <Stat
            label="Unrealised"
            value={signedMoney(book.unrealised)}
            tone={book.unrealised >= 0 ? "moss" : "loss"}
          />
          <Stat label="Cost basis" value={money(book.cost)} />
          <Stat
            label="Top two weight"
            value={holdings.length >= 2 ? `${Math.round(book.topTwo * 100)}%` : "—"}
            tone={book.topTwo >= 0.5 ? "loss" : undefined}
          />
        </Stats>

        {/*
          * ── The map leads ──
          *
          * This page was a spreadsheet: eight columns of right-aligned figures
          * under eight uppercase labels, which is a correct rendering of the
          * data and an unreadable one at a glance. Nobody screenshots a
          * spreadsheet.
          *
          * The heatmap answers the two questions a glance is actually asking —
          * what is this account mostly *in*, and what is it doing — in one
          * object, before a single row of the table is read. The table is
          * still here and still has every figure in it; it is just no longer
          * the first thing.
          */}
        <div className={styles.map} data-reveal>
          <Heatmap
            items={holdings.map((row) => ({
              symbol: row.symbol,
              value: row.value ?? 0,
              pnlPct: row.pnlPct,
            }))}
          />
        </div>

        {/*
          * The two ends of the book. Both are real rows off the ledger, and
          * both are absent rather than invented — an account where nothing is
          * priced has no ends to name.
          */}
        {ends ? (
          <div className={styles.ends} data-reveal>
            {ends.map((end) => (
              <div key={end.label} className={styles.endCard} data-tone={end.tone}>
                <span className={styles.endLabel}>{end.label}</span>
                <div className={styles.endRow}>
                  <Logo symbol={end.row.symbol} size={44} />
                  <div className={styles.endName}>
                    <span className={styles.endSymbol}>{end.row.symbol}</span>
                    {end.row.description ? (
                      <span className={styles.endDesc}>{end.row.description}</span>
                    ) : null}
                  </div>
                  <span className={`num ${styles.endFigure}`}>{signedPct(end.row.pnlPct)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className={styles.table} data-reveal>
          <div className={styles.headRow}>
            <span>Position</span>
            <span>Value</span>
            <span>Weight</span>
            <span>Unrealised</span>
            <span className={styles.end}>Shape</span>
          </div>

          {holdings.map((row, i) => {
            const weight = book.value ? ((row.value ?? 0) / book.value) * 100 : 0;
            const up = (row.pnlPct ?? 0) >= 0;
            return (
              <div
                key={row.symbol}
                className={styles.row}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={styles.position}>
                  {/*
                    * ── The standing ──
                    *
                    * The same device the map above and the race use, for the
                    * same reason: rank is a fact, and a fact set in type
                    * survives a reader who cannot separate two greens.
                    *
                    * Only on the two sorts that *are* a ranking. Sorted by
                    * name there is no first place, and a numeral there would
                    * be a drawn figure claiming something the order does not
                    * mean — so the chips simply are not there, which is also
                    * what makes the sort chips visibly do something.
                    */}
                  {isStanding && i < 3 ? (
                    <span className={`num ${styles.rank}`} aria-hidden="true">{i + 1}</span>
                  ) : null}
                  <Logo symbol={row.symbol} size={44} />
                  <div className={styles.name}>
                    <span className={styles.symbol}>{row.symbol}</span>
                    {row.description ? (
                      <span className={styles.desc}>{row.description}</span>
                    ) : null}
                    {/*
                      * Units, average cost and price were three columns of
                      * their own, which is three headings and three tab stops
                      * for a sentence: how many, what you paid, what it is
                      * now. Nothing is lost — it is one mono line under the
                      * name, where the eye reads it as detail rather than
                      * scanning it as a column.
                      */}
                    <span className={`num ${styles.detail}`}>
                      {row.units.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      {row.cost != null && row.units ? ` @ ${money(row.cost / row.units, 2)}` : ""}
                      {row.price != null ? ` · now ${money(row.price, 2)}` : ""}
                    </span>
                  </div>
                </div>

                <span className={`num ${styles.value}`}>{money(row.value)}</span>

                <div className={styles.weight}>
                  <span className={`num ${styles.weightPct}`}>{weight.toFixed(0)}%</span>
                  <span className={styles.weightTrack}>
                    <i
                      className={styles.weightFill}
                      style={{
                        width: `${weight.toFixed(1)}%`,
                        /*
                         * The exposure ramp, not the ring's old wedge hues.
                         * Those were a colour per slice — the one exemption
                         * the allocation ring had — and with the ring gone
                         * they were five decorative hues with no meaning,
                         * putting a red bar under a name that is up. Rank
                         * sets the step down `--signal`, so the bar means
                         * weight and only weight.
                         */
                        background: `var(--w${Math.min(i + 1, 5)})`,
                        animationDelay: `${100 + i * 50}ms`,
                      }}
                    />
                  </span>
                </div>

                {/*
                  * Direction was stated here in colour and nothing else,
                  * which is the one thing this palette's own rules forbid: a
                  * gained bar is solid and a lost one is hatched behind a
                  * hairline, everywhere else in the product. This column now
                  * carries the same 3px mark, so the reader who cannot
                  * separate moss from loss reads the direction off the fill
                  * exactly as they do in the map, the columns and the race.
                  */}
                <div className={styles.unrealised} data-dir={up ? "up" : "down"}>
                  <span className={styles.dirMark} aria-hidden="true" />
                  <span className={`num ${styles.unrealisedMoney}`} data-tone={up ? "moss" : "loss"}>
                    {signedMoney(row.pnl)}
                  </span>
                  <span className={`num ${styles.unrealisedPct}`} data-tone={up ? "moss" : "loss"}>
                    {signedPct(row.pnlPct)}
                  </span>
                </div>

                <div className={styles.end}>
                  <Sparkline series={shapeOf(row)} up={up} />
                </div>
              </div>
            );
          })}
        </div>

        {/*
          * Where the unrealised column came from.
          *
          * Two different figures share that column: our own arithmetic on the
          * cost basis, and the brokerage's own `open_pnl` where it reports a
          * P&L but no average purchase price. They are both honest and they
          * are not the same measurement, so the table says which it is
          * standing on rather than presenting one number in two dialects.
          */}
        {(() => {
          const broker = holdings.filter((row) => row.pnlSource === "broker").length;
          const unpriced = holdings.filter((row) => row.pnlSource === null).length;
          if (!broker && !unpriced) return null;
          return (
            <p className={styles.provenance} data-reveal>
              Unrealised is your cost basis
              {broker ? `, except on ${broker} your broker prices itself` : ""}
              {unpriced ? ` · ${unpriced} report neither and state no P&L` : ""}
            </p>
          );
        })()}

        {holdings.length >= 2 && book.topTwo >= 0.5 ? (
          <div className={styles.warn} data-reveal>
            <Warning />
            <p>
              {byValue[0].symbol} and {byValue[1].symbol} carry{" "}
              {Math.round(book.topTwo * 100)}% of your book. A 10% move in either is{" "}
              {money(topTwo * 0.1)} against you or for you in a day.
            </p>
          </div>
        ) : null}
      </Page>
    </>
  );
}

function compare(sort: Sort) {
  if (sort === "pnl") return (a: HoldingRow, b: HoldingRow) => (b.pnl ?? 0) - (a.pnl ?? 0);
  if (sort === "account") return (a: HoldingRow, b: HoldingRow) => a.symbol.localeCompare(b.symbol);
  return (a: HoldingRow, b: HoldingRow) => (b.value ?? 0) - (a.value ?? 0);
}

/**
 * The little line beside a row.
 *
 * We hold no per-symbol price history, so this is not one: it is the position's
 * own cost-to-mark path, drawn as the two points the ledger actually knows with
 * a smooth run between them. It is a direction, never a reading — which is why
 * it has no axis, no marker and no tooltip, and why every figure that matters
 * is stated in type to its left.
 */
function shapeOf(row: HoldingRow): number[] {
  const start = row.cost != null && row.units ? row.cost / row.units : row.price;
  const end = row.price;
  if (start == null || end == null || start <= 0) return [];
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    /* Ease so the line curves rather than ruling straight across the cell. */
    return start + (end - start) * (t * t * (3 - 2 * t));
  });
}

function Warning() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--loss)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 9v5" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}
