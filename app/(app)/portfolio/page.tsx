import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { holdingsFrom, isDbConfigured, loadAppData } from "@/lib/db";
import { Card, Eyebrow } from "@/components/primitives";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { EquityCurve } from "./EquityCurve";
import styles from "./portfolio.module.css";

export const metadata: Metadata = { title: "Bagcheck — portfolio" };
export const dynamic = "force-dynamic";

const money = (value: number | null, currency = "USD") =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);

export default async function PortfolioPage() {
  const userId = await getUserId();

  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · portfolio"
          title="Nothing to show yet"
          body={
            userId
              ? "The ledger store is not configured on this deployment."
              : "Sign in to see your holdings."
          }
          actions={[{ label: "Open the ledger view", href: "/debug", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const { connection, snapshots } = await loadAppData(userId, 1);
  const holdings = holdingsFrom(snapshots);

  if (!holdings.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · portfolio"
          title={connection ? "No positions synced" : "Connect a brokerage"}
          body={
            connection
              ? "Run a sync to pull your current positions from the brokerage."
              : "One tap via SnapTrade, read-only. Positions and history arrive together."
          }
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  const totalValue = holdings.reduce((sum, h) => sum + (h.value ?? 0), 0);
  const totalCost = holdings.reduce((sum, h) => sum + (h.cost ?? 0), 0);
  const totalPnl = totalCost ? totalValue - totalCost : null;
  const totalPct = totalCost ? ((totalValue - totalCost) / totalCost) * 100 : null;

  // Value per day across snapshots — the one screen equity curves belong on.
  const byDate = new Map<string, number>();
  for (const snap of snapshots) {
    const dayValue = (snap.positions ?? []).reduce(
      (sum, p) => sum + (p.price ?? 0) * (p.units ?? 0),
      0,
    );
    byDate.set(snap.date, (byDate.get(snap.date) ?? 0) + dayValue);
  }
  const series = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));

  const rail = (
    <Card tight>
      <div className={styles.railBlock}>
        <Eyebrow>Accounts</Eyebrow>
        {connection?.accounts.length ? (
          <ul className={styles.accountList}>
            {connection.accounts.map((account) => (
              <li key={account.id} className={styles.account}>
                <span className={styles.accountName}>{account.name ?? "Account"}</span>
                <span className={styles.accountMeta}>{account.institution ?? "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.railBody}>No accounts linked.</p>
        )}
      </div>
    </Card>
  );

  return (
    <PageGrid rail={rail}>
      <div className={styles.head}>
        <Eyebrow>Portfolio · {holdings.length} positions</Eyebrow>
        <div className={styles.totalLine}>
          <span className={`num ${styles.total}`}>{money(totalValue)}</span>
          {totalPnl != null ? (
            <span
              className={styles.delta}
              data-tone={totalPnl >= 0 ? "gold" : "clay"}
            >
              {totalPnl >= 0 ? "+" : "−"}
              {money(Math.abs(totalPnl))} ({totalPct?.toFixed(1)}%)
            </span>
          ) : null}
        </div>
      </div>

      {series.length > 1 ? (
        <section className={styles.block}>
          <Eyebrow>Value across synced days</Eyebrow>
          <EquityCurve series={series} />
        </section>
      ) : null}

      <section className={styles.block}>
        <Eyebrow>Holdings</Eyebrow>
        <div className={styles.holdings}>
          {holdings.map((holding) => (
            <div key={holding.symbol} className={styles.holding}>
              <div className={styles.holdingName}>
                <span className={styles.symbol}>{holding.symbol}</span>
                {holding.description ? (
                  <span className={styles.desc}>{holding.description}</span>
                ) : null}
              </div>
              <div className={styles.holdingNums}>
                <span className={styles.units}>
                  {holding.units.toLocaleString("en-US", { maximumFractionDigits: 4 })} units
                </span>
                <span className={styles.value}>{money(holding.value)}</span>
                {holding.pnlPct != null ? (
                  <span
                    className={styles.pnl}
                    data-tone={holding.pnlPct >= 0 ? "gold" : "clay"}
                  >
                    {holding.pnlPct >= 0 ? "+" : "−"}
                    {Math.abs(holding.pnlPct).toFixed(1)}%
                  </span>
                ) : (
                  <span className={styles.pnl}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageGrid>
  );
}
