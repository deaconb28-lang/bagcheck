import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { buildRoundTrips } from "@/lib/score";
import type { TxnLite } from "@/lib/score";
import { findings, whatIsMissing } from "@/lib/engine";
import { HourHeat } from "@/components/idioms";
import { Locked } from "@/components/app/Locked";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { SignInCta } from "@/components/app/SignInCta";
import { readiness } from "@/lib/tiers";
import { CORRELATION_FLOOR } from "@/lib/tags";
import { weekDelta } from "../derive";
import { DAYS, HOURS, hasClock, hourGrid } from "./hourGrid";
import screen from "../screen.module.css";
import styles from "./patterns.module.css";

export const metadata: Metadata = { title: "Bagcheck — patterns" };
export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const userId = await getUserId();

  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · patterns"
          icon="signin"
          title="Nothing to read yet"
          body={userId ? "The ledger store is not configured." : "Sign in to see what your history repeats."}
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const data = await loadScreen(userId, 400);
  // The engine needs the raw rows for entry timestamps; everything else comes
  // off the derived document.
  const { transactions } = await getCollections();
  const rows = await transactions
    .find({ userId })
    .sort({ date: 1 })
    .project<TxnLite>({ _id: 0, date: 1, type: 1, symbol: 1, units: 1, price: 1, amount: 1 })
    .toArray();

  if (!rows.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · patterns"
          icon={data.connection ? "sync" : "connect"}
          title={data.connection ? "No transactions synced" : "Connect a brokerage"}
          body={
            data.connection
              ? "Run a sync to pull your history. Patterns build from closed positions."
              : "One tap via SnapTrade, read-only. Years of history arrive in about ninety seconds."
          }
          actions={[{ label: "Open DNA", href: "/dna" }]}
        />
      </PageGrid>
    );
  }

  const trips = data.derived?.roundTrips ?? buildRoundTrips(rows);
  const found = findings(trips, rows);
  const missing = whatIsMissing(trips, rows);
  const clock = hasClock(rows);
  const grid = clock ? hourGrid(trips, rows) : null;

  // The sentence names the finding, not the chart. When the brokerage gives
  // no times there is no finding to name, and the grid does not render.
  const bestWindow = grid
    ? grid
        .flatMap((row, r) => row.map((cell, c) => ({ ...cell, r, c })))
        .filter((cell) => cell.n >= 3)
        .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))[0]
    : null;

  return (
    <>
      <ScreenHeader
        title="Patterns"
        meta={`${trips.length} closed positions · ${rows.length.toLocaleString("en-US")} rows read`}
        score={data.scores[0]?.score ?? null}
        delta={weekDelta(data.scores)}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        tier={data.tier}
      />

      <div className={screen.body}>
        <div className={screen.grid}>
          <div className={screen.column}>
            {grid ? (
              <section data-reveal className={`${screen.panel} ${screen.hero}`}>
                <div className={screen.head}>
                  <div className={screen.headText}>
                    <span className={screen.eyebrow}>Return by entry hour</span>
                    <div className={`disp ${screen.h2}`}>When you open matters</div>
                  </div>
                  <ShareButton type="quarter" label="this heatmap" size={34} />
                </div>

                <HourHeat days={DAYS} hours={HOURS} cells={grid} />

                <p className={screen.tail}>
                  {bestWindow && bestWindow.mean != null
                    ? `Your strongest window is ${DAYS[bestWindow.r]} at ${HOURS[bestWindow.c]}:00 — ${bestWindow.mean >= 0 ? "+" : "−"}${Math.abs(bestWindow.mean).toFixed(1)}% mean across ${bestWindow.n} positions.`
                    : "No window has enough entries yet to say anything about it."}
                </p>
              </section>
            ) : null}

            {found.length ? (
              found.map((finding, i) => (
                <section
                  key={finding.key}
                  data-reveal
                  className={screen.panel}
                  style={{ animationDelay: `${0.04 + i * 0.04}s` }}
                >
                  <div className={screen.head}>
                    <span className={screen.eyebrow}>{finding.tag}</span>
                    <div className={screen.spacer} />
                    <ShareButton type="quarter" label="this finding" />
                  </div>
                  <p className={`disp ${styles.claim}`}>{finding.sentence}</p>
                  <span className={styles.evidence}>{finding.evidence}</span>
                </section>
              ))
            ) : (
              <section data-reveal className={screen.panel}>
                <span className={screen.eyebrow}>Nothing above the floor</span>
                <p className={`disp ${styles.claim}`}>
                  No pattern here has enough behind it to be worth printing.
                </p>
                <p className={screen.tail}>{missing}</p>
              </section>
            )}

            <section data-reveal className={screen.panel} style={{ animationDelay: "0.2s" }}>
              <Locked
                capability="correlationCard"
                eyebrow="Conviction decay"
                readiness={readiness(data.tagged, CORRELATION_FLOOR)}
              >
                <div className={styles.decay}>
                  <div className={`num ${styles.decayValue}`}>4.1×</div>
                  <p className={screen.tail}>
                    Conviction-5 positions against your conviction-2 positions.
                  </p>
                </div>
              </Locked>
            </section>
          </div>

          <aside className={screen.rail}>
            <div className={screen.panel}>
              <span className={screen.eyebrow}>Closed positions read</span>
              <div className={`num ${screen.statValue}`}>{trips.length}</div>
              <p className={screen.tail}>
                Across {new Set(trips.map((t) => t.symbol)).size} names. Findings go
                quiet below their sample floor rather than reporting a coincidence.
              </p>
            </div>

            <div className={screen.panel}>
              <span className={screen.eyebrow}>What is still missing</span>
              <p className={screen.tail}>{missing}</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
