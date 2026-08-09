import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/auth";
import { isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { isMarketConfigured, refreshHoldings } from "@/lib/market";
import { EquityCurve, SegmentRing } from "@/components/idioms";
import { Logo } from "@/components/primitives";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { SignInCta } from "@/components/app/SignInCta";
import { archetypeOf, money, weekDelta } from "../derive";
import screen from "../screen.module.css";
import styles from "./dna.module.css";

export const metadata: Metadata = { title: "Bagcheck — DNA" };
export const dynamic = "force-dynamic";

export default async function DnaPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · DNA"
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to see your DNA"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : "Holdings, hold pattern and equity curve, read from your own brokerage history."
          }
          actions={[{ label: "Open the ledger view", href: "/debug", ghost: true }]}
        >
          {userId ? null : <SignInCta />}
        </EmptyState>
      </PageGrid>
    );
  }

  const data = await loadScreen(userId, 400);

  if (!data.holdings.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · DNA"
          icon={data.connection ? "sync" : "connect"}
          title={data.connection ? "No positions synced" : "Connect a brokerage"}
          body={
            data.connection
              ? "Run a sync to pull your current positions from the brokerage."
              : "One tap via SnapTrade, read-only. Positions and history arrive together."
          }
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  const snapshotDate = data.snapshots.reduce<string | null>(
    (latest, s) => (!latest || s.date > latest ? s.date : latest),
    null,
  );
  const today = new Date().toISOString().slice(0, 10);
  const { rows: holdings, provenance } = isMarketConfigured()
    ? await refreshHoldings(data.holdings, snapshotDate, today)
    : { rows: data.holdings, provenance: `Brokerage synced ${snapshotDate ?? "never"}` };

  const totalValue = holdings.reduce((s, h) => s + (h.value ?? 0), 0);
  const totalCost = holdings.reduce((s, h) => s + (h.cost ?? 0), 0);
  const returnPct = totalCost ? ((totalValue - totalCost) / totalCost) * 100 : null;

  const byDate = new Map<string, number>();
  for (const snap of data.snapshots) {
    const v = (snap.positions ?? []).reduce((s, p) => s + (p.price ?? 0) * (p.units ?? 0), 0);
    byDate.set(snap.date, (byDate.get(snap.date) ?? 0) + v);
  }
  const series = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));

  const latest = data.scores[0] ?? null;
  const archetype = archetypeOf(
    (latest?.components as unknown as Record<string, number>) ?? null,
  );

  // One line per scored day: out-of-rule days pale, exposure days signal.
  const segments = data.scores
    .slice(0, 63)
    .reverse()
    .map((s) =>
      s.score < 64 ? "empty" : s.components.exposure < 55 ? "exposed" : "kept",
    ) as Array<"empty" | "exposed" | "kept">;

  const winners = holdings.filter((h) => (h.pnlPct ?? 0) > 0).length;

  return (
    <>
      <ScreenHeader
        title="DNA"
        meta={`${holdings.length} positions · ${data.connection?.accounts.length ?? 0} accounts · ${data.transactionCount.toLocaleString("en-US")} transactions`}
        score={latest?.score ?? null}
        delta={weekDelta(data.scores)}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        age={data.investorAge}
        tier={data.tier}
      />

      <div className={screen.body}>
        <div className={screen.grid}>
          <div className={screen.column}>
            <section data-reveal className={`${screen.panel} ${screen.hero}`}>
              <div className={screen.head}>
                <div className={screen.headText}>
                  <span className={screen.eyebrow}>Portfolio value</span>
                  <div className={`num ${styles.bigFigure}`}>{money(totalValue)}</div>
                </div>
                <ShareButton type="equity" label="your return" size={34} />
              </div>

              <div className={styles.sideTiles}>
                <div className={screen.stat}>
                  <span className={screen.eyebrow}>Positions in profit</span>
                  <div className={`num ${screen.statValue}`}>
                    {winners}/{holdings.length}
                  </div>
                  <span className={screen.statTail}>
                    Against a cost basis of {money(totalCost)}.
                  </span>
                </div>
                <div className={screen.stat}>
                  <span className={screen.eyebrow}>Return on cost</span>
                  <div className={`num ${screen.statValue}`}>
                    {returnPct == null ? "—" : `${returnPct >= 0 ? "+" : "−"}${Math.abs(returnPct).toFixed(1)}%`}
                  </div>
                  <span className={screen.statTail}>
                    Unrealised, on what the brokerage currently marks.
                  </span>
                </div>
              </div>

              {/* The only place a full equity curve renders. */}
              {series.length > 1 ? <EquityCurve series={series} /> : null}
              <p className={styles.provenance}>{provenance}</p>
            </section>

            <section data-reveal className={screen.panel} style={{ animationDelay: "0.04s" }}>
              <div className={`disp ${screen.h2}`}>What you are holding</div>
              <div className={styles.holdings}>
                {holdings.map((h) => {
                  const weight = totalValue ? ((h.value ?? 0) / totalValue) * 100 : 0;
                  return (
                    <div key={h.symbol} className={styles.holding}>
                      <Logo symbol={h.symbol} size={30} />
                      <div className={styles.holdingName}>
                        <span className={styles.symbol}>{h.symbol}</span>
                        {h.description ? (
                          <span className={styles.desc}>{h.description}</span>
                        ) : null}
                      </div>
                      {/* Weight is neither discipline nor exposure — it is size. */}
                      <div className={styles.weight}>
                        <i style={{ width: `${weight.toFixed(1)}%` }} />
                      </div>
                      <span className={styles.units}>
                        {h.units.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </span>
                      <span className={styles.value}>{money(h.value)}</span>
                      <span
                        className={styles.ret}
                        data-tone={h.pnlPct == null ? undefined : h.pnlPct >= 0 ? "moss" : "loss"}
                      >
                        {h.pnlPct == null
                          ? "—"
                          : `${h.pnlPct >= 0 ? "+" : "−"}${Math.abs(h.pnlPct).toFixed(1)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section data-reveal className={styles.twoUp} style={{ animationDelay: "0.06s" }}>
              <div className={screen.panel}>
                <div className={screen.head}>
                  <div className={screen.headText}>
                    <span className={screen.eyebrow}>The quarter, day by day</span>
                    <div className={`disp ${screen.h2}`}>
                      {segments.filter((s) => s !== "empty").length} of {segments.length} inside
                      your rules
                    </div>
                  </div>
                  <ShareButton type="monthlyPnl" label="your months" />
                </div>
                <SegmentRing days={segments} />
              </div>

              <div className={screen.panel}>
                <span className={screen.eyebrow}>Identity</span>
                <div className={`disp ${styles.archName}`}>{archetype.name}</div>
                <p className={screen.tail}>{archetype.line}</p>
                <Link href="/patterns" className={styles.link}>
                  See the findings behind it
                </Link>
              </div>
            </section>
          </div>

          <aside className={screen.rail}>
            <div className={styles.shareSpec}>
              <span className={styles.specEyebrow}>Bagcheck · archetype</span>
              <div className={`num ${styles.specValue}`}>{archetype.name}</div>
              <p className={styles.specTail}>{archetype.line}</p>
              <div className={styles.specFoot}>
                <span className={styles.specUrl}>Read-only brokerage data</span>
                <ShareButton type="archetype" label="your archetype" size={34} onInk />
              </div>
            </div>

            <div className={screen.panel}>
              <span className={screen.eyebrow}>Accounts</span>
              <div className={styles.accounts}>
                {data.connection?.accounts.length ? (
                  data.connection.accounts.map((a) => (
                    <div key={a.id} className={styles.account}>
                      <span className={styles.accountName}>{a.name ?? "Account"}</span>
                      <span className={styles.accountMeta}>{a.institution ?? "—"}</span>
                    </div>
                  ))
                ) : (
                  <p className={screen.tail}>No accounts linked.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
