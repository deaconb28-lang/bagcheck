import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/auth";
import { isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { AppNav } from "@/components/app/AppNav";
import { shellUser } from "@/components/app/shellUser";
import { Avatar } from "@/components/primitives";
import { holdSplit, weekdayPnl, worstWeekday } from "@/lib/dash";
import { archetypeOf } from "../derive";
import { strongLine } from "@/lib/archetypes";
import { Page, PageHead, signedMoney } from "@/components/dash/Chrome";
import { HoldMeters, WeekdayBars } from "@/components/dash/Charts";
import {
  LockedCard,
  TeaserDeck,
  TeaserDistribution,
  TeaserRing,
} from "@/components/dash/Cards";
import styles from "./insights.module.css";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

/**
 * The patterns the ledger can prove, and honest holes where it cannot.
 *
 * The design asks for six cards. Four of them this product can compute from a
 * brokerage: the weekday pattern, the holding asymmetry, whatever the engine
 * has on file, and the archetype. Two of them — a peer percentile and the size
 * of the peer group it is drawn from — need a population this product does not
 * have, so they are drawn as locked tiles with the condition that would fill
 * them stated and nothing invented in the meantime. A card carrying a
 * plausible number is worse than a card carrying none, on the screen whose
 * whole claim is that its figures came off a brokerage.
 *
 * Every card that *is* here is self-silencing: below its sample floor the
 * engine returns nothing and the card is absent rather than reporting a
 * coincidence.
 */
export default async function InsightsPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) redirect("/you");

  const data = await loadScreen(userId, 400);
  const trips = data.derived?.roundTrips ?? [];
  const findings = data.derived?.findings ?? [];

  const week = weekdayPnl(trips);
  const worst = worstWeekday(week);
  const holds = holdSplit(
    data.derived?.holdTime.winnersMean ?? null,
    data.derived?.holdTime.losersMean ?? null,
  );
  const archetype = data.scores[0]?.components
    ? archetypeOf(data.scores[0].components as never)
    : null;

  /* Worst first: the point of the page is what a habit costs. */
  const ranked = [...findings].sort(
    (a, b) => (a.impact ?? Number.POSITIVE_INFINITY) - (b.impact ?? Number.POSITIVE_INFINITY),
  );

  const span = data.derived?.equitySeries.length ?? 0;
  const months = span ? Math.max(1, Math.round(span / 30)) : 0;

  return (
    <>
      <AppNav
        active="insights"
        accounts={data.connection?.accounts.length ?? 0}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        user={await shellUser()}
      />

      <Page>
        <div data-reveal>
          <PageHead
            eyebrow="Insights"
            title={patternTitle(countPatterns(worst, holds.ratio, ranked.length, archetype))}
            meta={`${trips.length.toLocaleString("en-US")} round trips${months ? ` · ${months} months` : ""}`}
          />
        </div>

        <div className={styles.grid}>
          {worst ? (
            <article className={styles.card} data-reveal>
              <div className={styles.head}>
                <span className={styles.eyebrow}>Weekday pattern</span>
                <span className={styles.tag} data-tone="loss">
                  Costing you
                </span>
              </div>
              <div className={styles.art}>
                <div className={styles.weekArt}>
                  <WeekdayBars cells={week} worst={worst.day} />
                </div>
              </div>
              <h2 className={styles.title}>{worst.day}days are your worst day</h2>
              <p className={styles.body}>
                Round trips closed on {worst.day} have booked{" "}
                {signedMoney(worst.amount)} across {worst.trades}{" "}
                {worst.trades === 1 ? "trip" : "trips"}. Every other weekday sits
                above it.
              </p>
              <div className={styles.spacer} />
              <div className={styles.foot} data-tone="loss">
                Realised on that weekday: {signedMoney(worst.amount)}
              </div>
            </article>
          ) : null}

          {holds.ratio && holds.winners != null && holds.losers != null ? (
            <article className={styles.card} data-reveal>
              <div className={styles.head}>
                <span className={styles.eyebrow}>Holding behaviour</span>
                <span
                  className={styles.tag}
                  data-tone={holds.direction === "cuts-winners" ? "loss" : "moss"}
                >
                  {holds.direction === "cuts-winners" ? "Costing you" : "Your edge"}
                </span>
              </div>
              <div className={styles.art}>
                <HoldMeters winners={holds.winners} losers={holds.losers} />
              </div>
              <h2 className={styles.title}>
                {holds.direction === "cuts-winners"
                  ? `You cut winners ${holds.ratio.toFixed(1)}× faster`
                  : `You hold winners ${holds.ratio.toFixed(1)}× longer`}
              </h2>
              <p className={styles.body}>
                Winners stay in the book {Math.round(holds.winners)} days on
                average and losers {Math.round(holds.losers)}.{" "}
                {holds.direction === "cuts-winners"
                  ? "Selling the good ones first is the clearest habit in your ledger."
                  : "Letting the good ones run is the clearest habit in your ledger."}
              </p>
              <div className={styles.spacer} />
              <div className={styles.foot}>
                {data.derived?.holdTime.winners ?? 0} winners ·{" "}
                {data.derived?.holdTime.losers ?? 0} losers
              </div>
            </article>
          ) : null}

          {ranked.slice(0, 2).map((finding) => (
            <article key={finding.key} className={styles.card} data-reveal>
              <div className={styles.head}>
                <span className={styles.eyebrow}>{finding.tag || "Pattern"}</span>
                <span
                  className={styles.tag}
                  data-tone={finding.impact != null && finding.impact >= 0 ? "moss" : "loss"}
                >
                  {finding.impact != null && finding.impact >= 0 ? "Your edge" : "Costing you"}
                </span>
              </div>
              <div className={styles.art}>
                <span
                  className={`num ${styles.bigFigure}`}
                  data-tone={finding.impact == null ? undefined : finding.impact >= 0 ? "moss" : "loss"}
                >
                  {finding.impact != null ? signedMoney(finding.impact) : "—"}
                </span>
              </div>
              <h2 className={styles.title}>{finding.sentence}</h2>
              <p className={styles.body}>{finding.evidence}</p>
              <div className={styles.spacer} />
              <div className={styles.foot}>
                Realised P&amp;L from your own fills, never a projection
              </div>
            </article>
          ))}

          {archetype ? (
            <article className={styles.card} data-reveal>
              <div className={styles.head}>
                <span className={styles.eyebrow}>Your type</span>
                <span className={styles.tag} data-tone="accent">
                  Profile
                </span>
              </div>
              <div className={styles.art}>
                <div className={styles.type}>
                  <Avatar archetype={archetype.key} size={92} />
                  <dl className={styles.typeList}>
                    {Object.entries(data.scores[0].components as unknown as Record<string, number>).map(
                      ([name, value]) => (
                        <div key={name} className={styles.typeRow}>
                          <dt>{name}</dt>
                          <dd className="num">{value}</dd>
                        </div>
                      ),
                    )}
                    {data.investorAge != null ? (
                      <div className={styles.typeRow}>
                        <dt>Investor age</dt>
                        <dd className="num">{data.investorAge}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
              <h2 className={styles.title}>{archetype.name}</h2>
              <p className={styles.body}>{archetype.line}</p>
              <div className={styles.spacer} />
              <div className={styles.foot}>{strongLine(archetype)}</div>
            </article>
          ) : null}

          {/*
            * The two the ledger cannot answer.
            *
            * A percentile needs a population and this product does not have
            * one. Rather than print a number nobody can check, the slot its
            * unlocked twin would occupy is drawn, the condition is stated, and
            * there is a button to be told when it lands.
            */}
          <LockedCard
            eyebrow="Vs peers"
            title="Where you sit against everyone else"
            body="Your return, patience and concentration ranked against investors matched to your account size and holding period."
            requires="Needs a peer base"
            teaser={<TeaserDistribution />}
            lit="var(--accent)"
          />

          <LockedCard
            eyebrow="Drawdown response"
            title="What you do when a position falls"
            body="Every sale made inside a drawdown, against what the position did afterwards — the one habit a P&L never shows you."
            requires="Needs intraday marks"
            teaser={<TeaserRing />}
            lit="var(--loss)"
          />

          {ranked.length === 0 && !worst && !holds.ratio ? (
            <LockedCard
              eyebrow="Patterns"
              title="Nothing has cleared a sample floor yet"
              body="A pattern is reported when your own history can prove it. Keep syncing and the first ones arrive on their own."
              requires="Needs more closed trips"
              teaser={<TeaserDeck />}
              lit="var(--ember)"
            />
          ) : null}
        </div>

        {ranked.length ? (
          <p className={styles.prov}>
            Every figure is realised P&amp;L from your own brokerage — what the
            habit actually returned, never a projection. Where no honest bucket
            exists the figure is absent rather than estimated.
          </p>
        ) : null}
      </Page>
    </>
  );
}

function countPatterns(
  worst: unknown,
  ratio: number | null,
  findings: number,
  archetype: unknown,
): number {
  return (worst ? 1 : 0) + (ratio ? 1 : 0) + Math.min(findings, 2) + (archetype ? 1 : 0);
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

function patternTitle(n: number): string {
  if (n === 0) return "Nothing your history can prove yet";
  return `${WORDS[n] ?? n} ${n === 1 ? "pattern" : "patterns"} in how you trade`;
}
