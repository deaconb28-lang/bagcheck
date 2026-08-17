import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicLedgerFor } from "@/lib/db/publicLedger";
import { Logo } from "@/components/primitives";
import styles from "./handle.module.css";

/**
 * Somebody's ledger, in public, at `/@handle`.
 *
 * A dynamic segment at the root catches anything no static route claimed, so
 * the first thing it does is refuse everything that is not a handle. Next
 * gives static segments precedence, so `/you` and `/wrapped` never reach here;
 * `/nonsense` does, and gets a 404 rather than a database lookup.
 *
 * `@` is not in the folder name on purpose: `app/@handle` is a *parallel route
 * slot* in this framework, not a path. The `@` lives in the URL and is stripped
 * here.
 *
 * Every figure is a percentage or a count. See `publicLedgerFor` for why —
 * the short version is that a portfolio's size is the fact that makes somebody
 * a target and it is never the interesting part.
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

function handleOf(segment: string): string | null {
  const decoded = decodeURIComponent(segment);
  return decoded.startsWith("@") ? decoded.slice(1) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle: segment } = await params;
  const handle = handleOf(segment);
  if (!handle) return {};
  const ledger = await publicLedgerFor(handle);
  if (!ledger) return {};
  return {
    title: `@${ledger.handle} · bagcheck`,
    description: `${ledger.positions} positions, read off a brokerage.`,
  };
}

export default async function PublicLedgerPage({ params }: Props) {
  const { handle: segment } = await params;
  const handle = handleOf(segment);
  if (!handle) notFound();

  const ledger = await publicLedgerFor(handle);
  if (!ledger) notFound();

  const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>public ledger</p>
        <h1 className={styles.handle}>@{ledger.handle}</h1>
        <p className={styles.tail}>
          {ledger.positions} {ledger.positions === 1 ? "position" : "positions"}
          {ledger.priced ? ` · ${ledger.winners} of ${ledger.priced} in profit` : ""}
          {ledger.syncedAt ? ` · read off a brokerage, synced ${ledger.syncedAt}` : ""}
        </p>
      </header>

      {ledger.returnPct != null ? (
        <p className={styles.figure} data-tone={ledger.returnPct >= 0 ? "moss" : "loss"}>
          {pct(ledger.returnPct)}
          <span className={styles.figureLabel}>return on cost, unrealised</span>
        </p>
      ) : null}

      <ol className={styles.rows}>
        {ledger.holdings.map((row) => (
          <li key={row.symbol} className={styles.row}>
            <span className={styles.mark} aria-hidden="true">
              <Logo symbol={row.symbol} size={26} />
            </span>
            <span className={styles.symbol}>{row.symbol}</span>
            <span className={styles.track}>
              <i className={styles.bar} style={{ width: `${row.weight * 100}%` }} />
            </span>
            <span className={`num ${styles.weight}`}>{(row.weight * 100).toFixed(0)}%</span>
            <span
              className={`num ${styles.pnl}`}
              data-tone={row.pnlPct == null ? undefined : row.pnlPct >= 0 ? "moss" : "loss"}
            >
              {row.pnlPct == null ? "—" : pct(row.pnlPct)}
            </span>
          </li>
        ))}
      </ol>

      {ledger.sectors.length >= 2 ? (
        <p className={styles.sectors}>
          {ledger.sectors
            .slice(0, 4)
            .map((s) => `${s.name} ${(s.share * 100).toFixed(0)}%`)
            .join(" · ")}
        </p>
      ) : null}

      {/*
        * Weights and returns, never dollars. Said out loud, because a reader
        * deciding whether to publish needs to know exactly what a stranger
        * sees — and a stranger reading it should know what it does not say.
        */}
      <p className={styles.note}>
        Weights and returns only. No balances, no trades, no dates.
      </p>
    </main>
  );
}
