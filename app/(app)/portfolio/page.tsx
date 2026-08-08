import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/auth";
import { holdingsFrom, isDbConfigured, loadAppData } from "@/lib/db";
import { Card, Eyebrow, Logo, Stat } from "@/components/primitives";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { PageHeader } from "@/components/app/PageHeader";
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

  const { connection, snapshots, transactionCount } = await loadAppData(userId, 1);
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
    <>
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
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Ledger</Eyebrow>
          <p className={styles.railBody}>
            {transactionCount.toLocaleString("en-US")} trades and transfers on file,
            exactly as the brokerage reported them.
          </p>
          <Link href="/activity" className={styles.railLink}>
            Open the activity ledger
          </Link>
        </div>
      </Card>
    </>
  );

  return (
    <PageGrid rail={rail}>
      <PageHeader
        title="Portfolio"
        subtitle={`${holdings.length} ${holdings.length === 1 ? "position" : "positions"} · last synced ${
          connection?.lastSyncAt ? connection.lastSyncAt.toISOString().slice(0, 10) : "never"
        }`}
      />

      <Card hero>
        <div className={styles.hero}>
          <Stat
            eyebrow="Portfolio value"
            value={money(totalValue)}
            unit={`across ${holdings.length} ${holdings.length === 1 ? "position" : "positions"}`}
            tone={totalPnl != null && totalPnl < 0 ? "ink" : "moss"}
            tail={
              totalPnl != null
                ? `Cost basis ${money(totalCost)} — ${totalPnl >= 0 ? "up" : "down"} ${money(Math.abs(totalPnl))}, ${Math.abs(totalPct ?? 0).toFixed(1)}%.`
                : "Cost basis has not synced for these positions yet."
            }
          />
          {series.length > 1 ? (
            <div className={styles.curveBlock}>
              <Eyebrow>Value across synced days</Eyebrow>
              <EquityCurve series={series} />
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className={styles.block}>
          <h2 className={`disp ${styles.h2}`}>What you are holding</h2>
          <div className={styles.holdings}>
            {holdings.map((holding) => (
              <div key={holding.symbol} className={styles.holding}>
                <div className={styles.holdingName}>
                  <Logo symbol={holding.symbol} size={30} />
                  <div className={styles.holdingText}>
                    <span className={styles.symbol}>{holding.symbol}</span>
                    {holding.description ? (
                      <span className={styles.desc}>{holding.description}</span>
                    ) : null}
                  </div>
                </div>
                <div className={styles.holdingNums}>
                  <span className={styles.units}>
                    {holding.units.toLocaleString("en-US", { maximumFractionDigits: 4 })} units
                  </span>
                  <span className={styles.value}>{money(holding.value)}</span>
                  {holding.pnlPct != null ? (
                    <span className={styles.pnl} data-tone={holding.pnlPct >= 0 ? "moss" : "clay"}>
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
        </div>
      </Card>
    </PageGrid>
  );
}
