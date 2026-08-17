import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/auth";
import { isDbConfigured, syncClock } from "@/lib/db";
import { dashboardFor } from "@/lib/portfolio/load";
import type { HoldingRow } from "@/lib/db";
import { AppNav } from "@/components/app/AppNav";
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

  const { data, view, facts } = await dashboardFor(userId, "all");
  const { sort: sortParam } = await searchParams;
  const sort: Sort =
    sortParam === "pnl" || sortParam === "account" ? sortParam : "weight";

  /* The book is the view's; this page only chooses an order to read it in. */
  const { book } = view;
  const holdings = [...facts.holdings].sort(compare(sort));
  const byValue = [...holdings].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const topTwo = byValue.slice(0, 2).reduce((sum, row) => sum + (row.value ?? 0), 0);
  const accounts = view.accounts;

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

        <div className={styles.table} data-reveal>
          <div className={styles.headRow}>
            <span>Position</span>
            <span>Qty</span>
            <span>Avg cost</span>
            <span>Price</span>
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
                  <Logo symbol={row.symbol} size={38} />
                  <div className={styles.name}>
                    <span className={styles.symbol}>{row.symbol}</span>
                    {row.description ? (
                      <span className={styles.desc}>{row.description}</span>
                    ) : null}
                  </div>
                </div>

                <span className={`num ${styles.cell}`}>
                  {row.units.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </span>
                <span className={`num ${styles.cell}`}>
                  {row.cost != null && row.units ? money(row.cost / row.units, 2) : "—"}
                </span>
                <span className={`num ${styles.cell}`}>{money(row.price, 2)}</span>
                <span className={`num ${styles.value}`}>{money(row.value)}</span>

                <div className={styles.weight}>
                  <span className={`num ${styles.weightPct}`}>{weight.toFixed(0)}%</span>
                  <span className={styles.weightTrack}>
                    <i
                      className={styles.weightFill}
                      style={{
                        width: `${weight.toFixed(1)}%`,
                        background: `var(--wedge-${Math.min(i + 1, 5)})`,
                        animationDelay: `${100 + i * 50}ms`,
                      }}
                    />
                  </span>
                </div>

                <div className={styles.unrealised}>
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
