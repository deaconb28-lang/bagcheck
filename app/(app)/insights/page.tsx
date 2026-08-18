import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/auth";
import { accessFor, getCollections, isDbConfigured, syncClock } from "@/lib/db";
import { dashboardFor } from "@/lib/portfolio/load";
import { INSIGHTS_MARKET_DAYS, insightsGate } from "@/lib/market/days";
import type { Pattern } from "@/lib/portfolio/types";
import { AppNav } from "@/components/app/AppNav";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { Paywall } from "@/components/app/Paywall";
import { shellUser } from "@/components/app/shellUser";
import { Page, PageHead, signedMoney } from "@/components/dash/Chrome";
import { HoldMeters, WeekdayBars } from "@/components/dash/Charts";
import { Avatar } from "@/components/primitives";
import {
  LockedCard,
  TeaserDeck,
  TeaserDistribution,
  TeaserRing,
} from "@/components/dash/Cards";
import styles from "./insights.module.css";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

const LABEL: Record<Pattern["kind"], string> = {
  weekday: "Weekday pattern",
  holds: "Holding behaviour",
  finding: "Pattern",
  profile: "Your type",
};

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

/**
 * The patterns the ledger can prove, and honest holes where it cannot.
 *
 * This page computes nothing. `view.patterns` arrives already shaped — its
 * headline, its sentence, its tone and the data its chart draws — so the whole
 * grid is one loop, and the difference between a weekday pattern and an engine
 * finding is a `chart.type` rather than a branch in a page.
 *
 * Two of the design's six cards need a population this product does not have.
 * They are locked tiles: the slot drawn, the condition stated, a drawing that
 * carries no numerals, and a button to be told when it lands. A card carrying
 * a plausible number is worse than a card carrying none, on the screen whose
 * whole claim is that its figures came off a brokerage.
 */
export default async function InsightsPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) redirect("/you");


  /*
   * The subscription gate, above everything this screen does.
   *
   * It runs before the ledger is read rather than after: a lapsed account
   * should not cost a full dashboard assembly to be turned away, and the
   * paywall has nothing to say that needs the data.
   */
  const access = await accessFor(userId);
  if (!access.allowed) return <Paywall trial={access.trial} />;

  /*
   * ── Ten market days before this screen says anything ──
   *
   * The engine already refuses to report a finding below its own sample
   * floor, so nothing here was ever *fabricated*. What it did do was greet a
   * reader on day two with "Nothing your history can prove yet", which is a
   * true sentence that reads as a broken screen — the ledger it is reading at
   * that point is mostly one opening snapshot.
   *
   * The clock is time, not activity, so it is reachable by every account
   * including one that holds and never trades. It runs from the brokerage
   * connection, which is the same anchor the trial uses.
   */
  const { connections } = await getCollections();
  const connection = await connections.findOne(
    { userId },
    { projection: { _id: 0, createdAt: 1, accounts: 1 } },
  );
  const gate = insightsGate(connection?.createdAt ?? null, new Date());
  if (!gate.unlocked) {
    return (
      <>
        <AppNav
          active="insights"
          accounts={connection?.accounts?.length ?? 0}
          syncedAt={null}
          user={await shellUser()}
        />
        <PageGrid>
          <EmptyState
            eyebrow="Insights"
            icon={connection ? "waiting" : "connect"}
            title={
              connection
                ? "Reading your first fortnight"
                : "Connect a brokerage to find your patterns"
            }
            body={
              connection
                ? `Patterns need ${INSIGHTS_MARKET_DAYS} market days of your ledger before this screen will claim one — ${gate.have} so far, ${gate.left} to go. Nothing is being withheld: a pattern read off a few days of one opening snapshot would be a coincidence with a headline.`
                : "One tap via SnapTrade, read-only. The clock on this screen starts when your account links."
            }
            actions={
              connection
                ? [{ label: "Back to the dashboard", href: "/you" }]
                : [{ label: "Connect a brokerage", href: "/start" }]
            }
          />
        </PageGrid>
      </>
    );
  }

  const { data, view, facts } = await dashboardFor(userId, "all");
  const months = facts.curve.length ? Math.max(1, Math.round(facts.curve.length / 30)) : 0;
  const n = view.patterns.length;

  return (
    <>
      <AppNav
        active="insights"
        accounts={view.accounts}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        user={await shellUser()}
      />

      <Page>
        <div data-reveal>
          <PageHead
            eyebrow="Insights"
            title={
              n === 0
                ? "Nothing your history can prove yet"
                : `${WORDS[n] ?? n} ${n === 1 ? "pattern" : "patterns"} in how you trade`
            }
            meta={`${facts.trips.length.toLocaleString("en-US")} round trips${months ? ` · ${months} months` : ""}`}
          />
        </div>

        <div className={styles.grid}>
          {view.patterns.map((pattern) => (
            <article key={pattern.key} className={styles.card} data-reveal>
              <div className={styles.head}>
                <span className={styles.eyebrow}>{LABEL[pattern.kind]}</span>
                <span
                  className={styles.tag}
                  data-tone={pattern.kind === "profile" ? "accent" : pattern.tone}
                >
                  {pattern.kind === "profile"
                    ? "Profile"
                    : pattern.tone === "loss"
                      ? "Costing you"
                      : "Your edge"}
                </span>
              </div>

              <div className={styles.art}>
                {pattern.chart.type === "weekday" ? (
                  <div className={styles.weekArt}>
                    <WeekdayBars cells={pattern.chart.cells} worst={pattern.chart.worst} />
                  </div>
                ) : pattern.chart.type === "holds" ? (
                  <HoldMeters winners={pattern.chart.winners} losers={pattern.chart.losers} />
                ) : pattern.chart.type === "profile" ? (
                  <div className={styles.type}>
                    <Avatar archetype={pattern.chart.archetype} size={92} />
                    <dl className={styles.typeList}>
                      {Object.entries(pattern.chart.components).map(([name, value]) => (
                        <div key={name} className={styles.typeRow}>
                          <dt>{name}</dt>
                          <dd className="num">{value}</dd>
                        </div>
                      ))}
                      {pattern.chart.age != null ? (
                        <div className={styles.typeRow}>
                          <dt>Investor age</dt>
                          <dd className="num">{pattern.chart.age}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                ) : (
                  <span className={`num ${styles.bigFigure}`} data-tone={pattern.tone}>
                    {pattern.impact != null ? signedMoney(pattern.impact) : "—"}
                  </span>
                )}
              </div>

              <h2 className={styles.title}>{pattern.title}</h2>
              <p className={styles.body}>{pattern.body}</p>
              <div className={styles.spacer} />
              <div
                className={styles.foot}
                data-tone={pattern.impact != null ? pattern.tone : undefined}
              >
                {pattern.impact != null
                  ? `Realised: ${signedMoney(pattern.impact)}`
                  : pattern.kind === "profile"
                    ? "Sixteen corners of a four-bit cube — you land in exactly one"
                    : "Measured across every closed round trip"}
              </div>
            </article>
          ))}

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

          {n === 0 ? (
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

        {n ? (
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
