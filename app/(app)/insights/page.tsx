import type { Metadata } from "next";
import { getUserId } from "@/auth";
import {
  factsFrom,
  getDailyInsight,
  isDbConfigured,
  loadScreen,
  syncClock,
} from "@/lib/db";
import { Locked } from "@/components/app/Locked";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { SignInCta } from "@/components/app/SignInCta";
import { can, readiness } from "@/lib/tiers";
import type { Capability } from "@/lib/tiers";
import { CORRELATION_FLOOR } from "@/lib/tags";
import { currentStreak, longestStreak, weekDelta } from "../derive";
import screen from "../screen.module.css";
import styles from "./insights.module.css";

export const metadata: Metadata = { title: "Bagcheck — insights" };
export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · insights"
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to read your insight"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : "One written paragraph each night, built from your own scored days."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          {userId ? null : <SignInCta />}
        </EmptyState>
      </PageGrid>
    );
  }

  const data = await loadScreen(userId, 400);
  const latest = data.scores[0] ?? null;

  if (!latest) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · insights"
          icon={data.connection ? "waiting" : "connect"}
          title={data.connection ? "No score yet" : "Connect a brokerage"}
          body="The nightly insight is written from your scored days. It starts once the first one exists."
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  const wHold = data.derived?.holdTime.winnersMean ?? null;
  const lHold = data.derived?.holdTime.losersMean ?? null;

  const insight = await getDailyInsight(
    userId,
    factsFrom(
      latest,
      data.scores[1] ?? null,
      data.scores.slice(0, 7).at(-1) ?? null,
      data.transactionCount,
      data.connection?.accounts.length ?? 0,
    ),
  );

  const ready = readiness(data.tagged, CORRELATION_FLOOR);
  const inRule = data.scores.filter((s) => s.score >= 64).length;

  // Three free, three locked. Every locked one carries its own data state.
  const free = [
    {
      eyebrow: "Average hold — winners",
      value: wHold == null ? "—" : `${wHold < 10 ? wHold.toFixed(1) : wHold.toFixed(0)}d`,
      tail:
        lHold != null && lHold > 0.5 && wHold != null
          ? `Your losers: ${lHold < 10 ? lHold.toFixed(1) : lHold.toFixed(0)} days.`
          : "Not enough closed positions to compare yet.",
      type: "holdRatio",
    },
    {
      eyebrow: "Sessions inside your rules",
      value: String(inRule),
      tail: `Of ${data.scores.length} scored days. Longest run: ${longestStreak(data.scores)}.`,
      type: "streak",
    },
    {
      eyebrow: "Current streak",
      value: `${currentStreak(data.scores)}d`,
      tail: "Consecutive scored sessions at or above your baseline.",
      type: "streak",
    },
  ];

  const locked: Array<{ eyebrow: string; value: string; tail: string; cap: Capability }> = [
    {
      eyebrow: "Conviction decay",
      value: "4.1×",
      tail: "Conviction-5 positions against your conviction-2 positions.",
      cap: "correlationCard",
    },
    {
      eyebrow: "Sizing drift after a loss",
      value: "+2.4×",
      tail: "Median position size after two red sessions, against your baseline.",
      cap: "correlationCard",
    },
    {
      eyebrow: "Setup performance",
      value: "61%",
      tail: "Breakout setups, across your tagged trades.",
      cap: "setupPerformance",
    },
  ];

  return (
    <>
      <ScreenHeader
        title="Insights"
        meta="written nightly · never a recommendation"
        score={latest.score}
        delta={weekDelta(data.scores)}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        age={data.investorAge}
        tier={data.tier}
      />

      <div className={screen.body}>
        <div className={screen.grid}>
          <div className={screen.column}>
            {/* The one place the reserved accent appears: Bagcheck wrote this.
                It is this screen's hero, so it carries the shared halo. */}
            <section
              data-reveal
              className={`${screen.panel} ${screen.hero} ${styles.written}`}
              data-halo="accent"
            >
              <div className={styles.writtenHead}>
                <span className={styles.accentDot} aria-hidden="true" />
                <span className={styles.writtenEyebrow}>Written by Bagcheck · {latest.date}</span>
                <div className={screen.spacer} />
                <ShareButton type="health" label="tonight's insight" />
              </div>
              <p className={`disp ${styles.writtenText}`}>{insight.sentence}</p>
              {insight.tail ? <p className={screen.tail}>{insight.tail}</p> : null}
            </section>

            <section data-reveal className={styles.cardGrid} style={{ animationDelay: "0.05s" }}>
              {free.map((card) => (
                <div key={card.eyebrow} className={screen.panel}>
                  <div className={screen.head}>
                    <span className={screen.eyebrow}>{card.eyebrow}</span>
                    <div className={screen.spacer} />
                    <ShareButton type={card.type} label={card.eyebrow.toLowerCase()} />
                  </div>
                  <div className={`num ${styles.cardValue}`}>{card.value}</div>
                  <p className={screen.tail}>{card.tail}</p>
                </div>
              ))}

              {locked.map((card) =>
                can({ tier: data.tier }, card.cap) ? (
                  <div key={card.eyebrow} className={screen.panel}>
                    {/* No share button: these formats do not mint yet, and a
                        button that always refuses is worse than none. */}
                    <div className={screen.head}>
                      <span className={screen.eyebrow}>{card.eyebrow}</span>
                    </div>
                    <div className={`num ${styles.cardValue}`}>{card.value}</div>
                    <p className={screen.tail}>{card.tail}</p>
                  </div>
                ) : (
                  <div key={card.eyebrow} className={screen.panel}>
                    <Locked capability={card.cap} eyebrow={card.eyebrow} readiness={ready}>
                      <div className={`num ${styles.cardValue}`}>{card.value}</div>
                      <p className={screen.tail}>{card.tail}</p>
                    </Locked>
                  </div>
                ),
              )}
            </section>

            <section data-reveal className={styles.badge} style={{ animationDelay: "0.1s" }}>
              <div className={styles.badgeSpec}>
                <span className={styles.badgeScore}>{latest.score}</span>
                <div className={styles.badgeText}>
                  <span className={styles.badgeLabel}>Bagcheck Health</span>
                  <span className={styles.badgeMeta}>read-only · verified</span>
                </div>
              </div>
              <p className={styles.badgeCopy}>
                The live badge is a Plus format. What it reports — your score — is
                free, visible here, and shareable at full quality on any plan.
              </p>
            </section>
          </div>

          <aside className={screen.rail}>
            <div className={screen.panel}>
              <span className={screen.eyebrow}>Where the locks come from</span>
              <p className={screen.tail}>
                Each locked insight needs tagged entries, not a payment. You have{" "}
                {data.tagged} on file; correlations run at {CORRELATION_FLOOR}. Paying
                unlocks the format, and the data is yours either way.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
