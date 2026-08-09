import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { buildRoundTrips } from "@/lib/score";
import type { TxnLite } from "@/lib/score";
import {
  eventSegments,
  findings,
  taggedFindings,
  tiltFindings,
  whatIsMissing,
  whatTagsAreMissing,
} from "@/lib/engine";
import type { TaggedOpen } from "@/lib/engine";
import { HourHeat } from "@/components/idioms";
import { Locked } from "@/components/app/Locked";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { SignInCta } from "@/components/app/SignInCta";
import { can, readiness } from "@/lib/tiers";
import { CORRELATION_FLOOR } from "@/lib/tags";
import type { WhyKey } from "@/lib/tags";
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
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to see what repeats"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : "Entries by hour, session size and the reasons you gave — what your history does again and again."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          {userId ? null : <SignInCta />}
        </EmptyState>
      </PageGrid>
    );
  }

  const data = await loadScreen(userId, 400);
  // The engine needs the raw rows for entry timestamps; everything else comes
  // off the derived document. externalId rides along so tags can join back.
  const { transactions, tags } = await getCollections();
  const [rows, tagDocs] = await Promise.all([
    transactions
      .find({ userId })
      .sort({ date: 1 })
      .project<TxnLite & { externalId: string | null }>({
        _id: 0,
        externalId: 1,
        date: 1,
        type: 1,
        symbol: 1,
        units: 1,
        price: 1,
        amount: 1,
      })
      .toArray(),
    tags
      .find({ userId })
      .project<{ transactionId: string; why: WhyKey; conviction: 1 | 2 | 3 | 4 | 5 }>({
        _id: 0,
        transactionId: 1,
        why: 1,
        conviction: 1,
      })
      .toArray(),
  ]);

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

  /*
   * The join the whole engine layer waits on: a tag knows its transaction,
   * the transaction knows its symbol and day, and a round trip is keyed by
   * both. Reasons are already stored lower-cased (see TagDoc).
   */
  const txnById = new Map(rows.filter((r) => r.externalId).map((r) => [r.externalId, r]));
  const opens: TaggedOpen[] = [];
  const kindCounts: Partial<Record<WhyKey, number>> = {};
  for (const tag of tagDocs) {
    kindCounts[tag.why] = (kindCounts[tag.why] ?? 0) + 1;
    const txn = txnById.get(tag.transactionId);
    if (!txn?.symbol || !txn.date) continue;
    opens.push({
      symbol: txn.symbol,
      date: txn.date.slice(0, 10),
      why: tag.why,
      conviction: tag.conviction,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const tagFound = taggedFindings(trips, opens, kindCounts);
  const found = [
    ...tagFound,
    ...findings(trips, rows),
    ...tiltFindings(trips, rows, today),
  ];
  const segments = eventSegments(data.derived?.equitySeries ?? [], trips, rows);
  const missing = whatIsMissing(trips, rows);
  const tagsMissing = whatTagsAreMissing(opens, kindCounts);
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
        meta={`${trips.length} closed positions · ${opens.length} carry a reason · ${rows.length.toLocaleString("en-US")} rows read`}
        score={data.scores[0]?.score ?? null}
        delta={weekDelta(data.scores)}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        age={data.investorAge}
        tier={data.tier}
      />

      <div className={screen.body}>
        <div className={screen.grid}>
          <div className={screen.column}>
            {grid ? (
              // Azure, because the panel's subject is a comparison across entry
              // windows — never discipline (moss) or Bagcheck's own voice (accent).
              <section data-reveal className={`${screen.panel} ${screen.hero}`} data-halo="azure">
                <div className={screen.head}>
                  <div className={screen.headText}>
                    <span className={screen.eyebrow}>Return by entry hour</span>
                    <div className={`disp ${screen.h2}`}>When you open matters</div>
                  </div>
                  <ShareButton type="cadence" label="your rhythm" size={34} />
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
                  {/* No share button on a finding: the correlation card is
                      the Plus format and it does not mint yet. */}
                  <div className={screen.head}>
                    <span className={screen.eyebrow}>{finding.tag}</span>
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

            {/*
              * The reader's own stress windows. Finding-shaped on purpose: a
              * future segment leaderboard scores the same object, and until a
              * user base exists no rank is claimed anywhere.
              */}
            {segments.map((segment, i) => (
              <section
                key={segment.key}
                data-reveal
                className={screen.panel}
                style={{ animationDelay: `${0.08 + i * 0.04}s` }}
              >
                <div className={screen.head}>
                  <span className={screen.eyebrow}>{segment.tag}</span>
                  <div className={screen.spacer} />
                  <ShareButton type="drawdownHeld" label="this window" />
                </div>
                <p className={`disp ${styles.claim}`}>{segment.sentence}</p>
                <span className={styles.evidence}>{segment.evidence}</span>
              </section>
            ))}

            {/*
              * The correlation *card* is the Plus format. The findings above
              * stay free — what is paid is the shareable artefact, so the
              * lock disappears once the capability is held.
              */}
            {!can({ tier: data.tier }, "correlationCard") ? (
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
            ) : null}
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
              {tagsMissing ? <p className={screen.tail}>{tagsMissing}</p> : null}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
