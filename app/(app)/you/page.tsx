import type { Metadata } from "next";
import Link from "next/link";
import { getUserId, isAuthConfigured } from "@/auth";
import { accessFor, factsFrom, getDailyInsight, isDbConfigured, loadScreen, syncClock, wrappedOpenedAt } from "@/lib/db";
import { dashboardFor, fieldLine, rangeOf } from "@/lib/portfolio/load";
import { RATE_FLOOR } from "@/lib/portfolio/view";
import type { Pattern } from "@/lib/portfolio/types";
import { EmptyState } from "@/components/app/EmptyState";
import { FirstScore } from "@/components/app/FirstScore";
import { PageGrid } from "@/components/app/PageGrid";
import { AppNav } from "@/components/app/AppNav";
import { Paywall } from "@/components/app/Paywall";
import { shellUser } from "@/components/app/shellUser";
import { SignInCta } from "@/components/app/SignInCta";
import { SyncDialog } from "@/components/app/SyncDialog";
import { TRIAL_DAYS, trialLine, trialState } from "@/lib/tiers";
import {
  Act,
  Page,
  PageHead,
  Panel,
  PanelHead,
  PanelNote,
  Row,
  Stat,
  Split,
  Stats,
  TotalValue,
  money,
  signedMoney,
  signedPct,
} from "@/components/dash/Chrome";
import { RaceBars } from "@/components/dash/RaceBars";
import {
  ChartAxis,
  HoldMeters,
  Legend,
  PnlColumns,
  PnlWave,
  SectorMix,
  WeekdayBars,
} from "@/components/dash/Charts";
import { InsightCard, WrappedPromo } from "@/components/dash/Cards";
import { Heatmap } from "@/components/dash/Heatmap";
import { nextUp, trophiesFrom } from "@/lib/trophies";
import { activityCalendar, investedCurve, positionColumns } from "@/lib/dayone";
import { WrappedReady } from "@/components/dash/WrappedReady";
import { BookLead } from "@/components/dash/BookLead";
import { PositionsTable } from "@/components/dash/PositionsTable";
import { MoneyHero } from "@/components/dash/MoneyHero";
import { ReturnBars } from "@/components/idioms";
import heroStyles from "@/components/dash/hero.module.css";
import type { WheelPosition } from "@/lib/wheel";
import { Collection } from "@/components/dash/Collection";
import { EquityCurve, HeatGrid } from "@/components/idioms";

/**
 * One window, and it is the year.
 *
 * There were three chips — 45D, YTD, ALL — and they were a control asking to
 * be operated on a screen whose job is to say one thing. Two of the three
 * changed the headline figure and nothing else on the page, because the race
 * is always year to date, the score is always tonight's, and the set is always
 * this year's. A control that moves one number out of eight is furniture.
 *
 * Year to date is the window everything else on the screen already agrees on.
 */

/**
 * Below this the grid is one lit cell in a field of empties, which reads as a
 * broken chart rather than as a young account. The hero already states the
 * score and the run; the history waits until there is one.
 */
const MIN_SCORED_DAYS = 8;

/*
 * What each finding measured, as its card's eyebrow says it.
 *
 * The kind rather than the finding: the headline under it already states the
 * finding, and a label restating its own heading is a label doing no work.
 */
const INSIGHT_EYEBROW: Record<Pattern["kind"], string> = {
  weekday: "Weekday pattern",
  holds: "Holding behaviour",
  finding: "Ledger finding",
  profile: "Your profile",
};

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * The dashboard.
 *
 * Total value and the window's move, four stats, the race, the daily columns
 * beside the allocation ring, this week's insights beside the year. Every
 * figure comes off the reader's own brokerage or off a fund quote with a
 * ticker on it, and anything that cannot is absent rather than estimated.
 *
 * The range chips are links rather than state: a window is a place you can be
 * sent to and linked to, and making it component state would have cost this
 * page its server rendering for the sake of three buttons.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; range?: string }>;
}) {
  const userId = await getUserId();
  const { connected, range: rawRange } = await searchParams;
  /* `rangeOf` and `dashboardFor(userId, range)` were both written for this and
     never called with anything but a constant. */
  const RANGE = rangeOf(rawRange);

  const syncDialog =
    connected === "1" && userId ? (
      <SyncDialog
        today={new Date().toISOString().slice(0, 10)}
        trialLine={trialLine(trialState(new Date(), new Date()))}
      />
    ) : null;

  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="supercruise"
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to see your dashboard"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : isAuthConfigured()
                ? `Your P&L, your holdings, your year. ${TRIAL_DAYS} days free, no card.`
                : "Sign-in is not configured here."
          }
          actions={[{ label: "Connect a brokerage", href: "/start", ghost: true }]}
        >
          {userId ? null : <SignInCta />}
        </EmptyState>
      </PageGrid>
    );
  }


  /*
   * The subscription gate, above everything this screen does.
   *
   * It runs before the ledger is read rather than after: a lapsed account
   * should not cost a full dashboard assembly to be turned away, and the
   * paywall has nothing to say that needs the data.
   */
  const access = await accessFor(userId);
  if (!access.allowed) return <Paywall trial={access.trial} />;

  const data = await loadScreen(userId, 400);
  const latest = data.scores[0] ?? null;

  if (!latest && !data.holdings.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="supercruise"
          icon={data.connection ? "waiting" : "connect"}
          title={data.connection ? "Nothing read yet" : "Connect a brokerage"}
          body={
            data.connection
              ? `${data.transactionCount.toLocaleString("en-US")} transactions on file. Scoring builds the dashboard from them.`
              : `One tap via SnapTrade, read-only. ${TRIAL_DAYS} days free after it connects, no card.`
          }
          actions={
            data.connection
              ? [{ label: "See your Wrapped", href: "/wrapped", ghost: true }]
              : [{ label: "Connect a brokerage", href: "/start" }]
          }
        >
          {data.connection ? <FirstScore /> : null}
        </EmptyState>
        {syncDialog}
      </PageGrid>
    );
  }

  /*
   * The screen above is handed straight to the assembly rather than re-read.
   * And the shell's user is fetched alongside it: it used to sit inline in the
   * JSX below, which made it a second round trip that only started once the
   * whole dashboard had finished assembling.
   */
  /*
   * The night's written reading, fetched alongside the assembly rather than
   * after it.
   *
   * It is normally a single indexed read: the nightly job warms this row for
   * every connected user, so by the time a screen asks it is already there.
   * The uncached path — a fresh account whose first score landed today — is a
   * model call, which is exactly what this group's `loading.tsx` exists for.
   * Swallowed on failure, because a dashboard must not fail on a sentence.
   */
  const [{ view, facts }, user, note, openedWrapped] = await Promise.all([
    dashboardFor(userId, RANGE, data),
    shellUser(),
    latest
      ? getDailyInsight(
          userId,
          factsFrom(
            latest,
            data.scores[1] ?? null,
            data.scores[6] ?? null,
            data.transactionCount,
            data.connection?.accounts?.length ?? 0,
          ),
        ).catch(() => null)
      : Promise.resolve(null),
    /*
     * Whether the year has ever been opened. One indexed read, in the same
     * round trip as everything else — the notice above the fold has to be
     * decided before the page renders, not after.
     */
    wrappedOpenedAt(userId).catch(() => null),
  ]);
  const { book, performance: perf, window } = view;

  /*
   * The archetype has a hero now, so it stops being a row in the insight list.
   * It was rendering three times on one screen — in the ring, in this list,
   * and on the Wrapped promo — and a reading restated three ways reads as a
   * product with one thing to say.
   */
  /*
   * ── What the first sync can already draw ──
   *
   * The blocks below used to gate on *our* history — a closed round trip, two
   * days of equity marks, eight scored nights — and a freshly connected
   * account has none of it, so five panels in a row arrived empty. But a first
   * sync hands over the whole transaction record and a priced snapshot, which
   * is enough for a real curve, a real calendar and a real set of columns.
   * Every one of these is computed from those two and nothing else.
   */
  const invested = investedCurve(facts.ledger);
  const activity = activityCalendar(facts.ledger);
  /*
   * A session set that is all zeroes is not a chart.
   *
   * Every column is drawn as a share of the window's peak, so a set of
   * sessions whose amounts are all zero renders as a full-width panel of
   * blank space under a heading and a legend — the shape of a chart with
   * nothing in it, which is indistinguishable from one that failed. The
   * length of the array was the only gate, and length is the wrong question:
   * what matters is whether anything in it has height. When nothing does, the
   * unrealised columns are the better answer, and they are a real measurement
   * rather than a placeholder.
   */
  const realisedDrawable = perf.sessions.some((session) => session.amount !== 0);

  /*
   * Off the *refreshed* positions, like every other chart here.
   *
   * This read `data.holdings` — the rows as Mongo stored them, before the
   * market layer corrects a mark the last sync left stale. So the wheel and
   * the map could draw a name that this panel had already dropped, and the
   * largest chart on the screen would say the book has nothing to show while
   * the two above it drew it in full.
   */
  const unrealisedColumns = positionColumns(view.positions);

  /*
   * ── The wheel's input ──
   *
   * Weight is a share of the *invested* book plus whatever cash the broker
   * reported, so the angles sum to the account rather than to the positions
   * alone — a book that is a fifth cash and does not say so overstates every
   * name on it by a fifth.
   *
   * `pnlPct` is return on cost, which is the figure the radius means. A
   * holding the broker priced but gave no cost basis for has no return to
   * draw, so it is left out of the wheel entirely rather than drawn at zero:
   * a wedge sitting exactly on break-even is a statement, and "we don't know"
   * is not that statement.
   */
  const wheelPositions: WheelPosition[] = (() => {
    /*
     * Weight is a share of the priced book, and cash is **not added on top**.
     *
     * It was, and the result was the same money drawn twice: a money-market
     * fund comes back from the brokerage as a position *and* inside the
     * reported cash balance — the double-count this repo already documents
     * for the equity curve — so a book that was a quarter cash rendered as
     * SPAXX at 26.2% beside a CASH wedge at 26.2%, and every real position
     * was understated by half. `HoldingRow` carries no cash-equivalent flag
     * to detect it with, and inventing one would be guessing; the fund is
     * already in the positions, so the positions are the whole book.
     *
     * `pnlPct` is return on cost, which is what the radius means. A holding
     * the broker priced but gave no cost basis for has no return to draw and
     * is left out rather than drawn at zero — a wedge on the break-even ring
     * is a statement, and "we don't know" is not that statement.
     */
    const priced = view.allocation.filter((slice) => slice.value > 0 && slice.pnlPct != null);
    const total = priced.reduce((sum, slice) => sum + slice.value, 0);
    if (total <= 0) return [];

    return priced
      .map((slice) => ({
        ticker: slice.label,
        weight: (slice.value / total) * 100,
        ret: slice.pnlPct as number,
      }))
      .sort((a, b) => b.weight - a.weight);
  })();



  /*
   * The closest unearned trophy, for the read's foot.
   *
   * `trophiesFrom` is pure and reads the screen this page already loaded, so
   * this costs nothing — no extra query, no second assembly. Only the ones
   * with a real count on both sides can be "closest" at all; a single-event
   * trophy is done or it is not, and it is filtered out rather than shown at
   * zero, which would push a genuinely close one off a one-line hook.
   */
  const nextTrophy = view.read
    ? (() => {
        const open = nextUp(
          trophiesFrom({
            days: data.scores.map((score) => ({
              date: score.date,
              score: score.score,
              components: score.components,
              contributors: score.contributors,
            })),
            roundTrips: data.derived?.roundTrips ?? [],
            holdings: data.holdings.length,
          }),
          4,
        ).find((t) => t.progress);
        return open && open.progress
          ? {
              name: open.name,
              requires: open.requires,
              have: open.progress.have,
              need: open.progress.need,
            }
          : null;
      })()
    : null;

  const insights = view.read
    ? view.patterns.filter((pattern) => pattern.chart.type !== "profile")
    : view.patterns;

  return (
    <>
      {syncDialog}
      <AppNav
        active="dash"
        accounts={view.accounts}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        user={user}
      />

      <Page>
        {/*
          * ── The read leads ──
          *
          * Account value used to open this screen, and it is the least
          * interesting true thing here: a brokerage app says the same number
          * faster, and it moves whether or not the reader did anything. What
          * this product knows that nothing else does is what the conduct
          * looked like — it has been computing exactly that every night and
          * drawing it at 64px on a settings page.
          *
          * Absent, not defaulted: `view.read` is null until the first nightly
          * score lands, and an account with holdings but no score falls
          * straight through to the dashboard. On that path the money leads,
          * exactly as it used to.
          */}
        {/*
          * The one notice this screen has, and the first thing on it.
          *
          * A reader who has just connected has a deck waiting — the sync
          * builds it now rather than leaving it for whoever opens `/wrapped`
          * first — and nothing here said so. It is above the read because the
          * read is what the product concluded and this is what the reader came
          * for; the ordering is only wrong for somebody who has already seen
          * it, and for them it is not rendered at all.
          */}
        {view.wrapped.earned > 0 && !openedWrapped ? (
          <WrappedReady
            year={view.wrapped.year}
            earned={view.wrapped.earned}
            total={view.wrapped.total}
          />
        ) : null}

        {/*
          * ── Three acts ──
          *
          * The page is eleven plates deep and every one of them is the same
          * near-black rectangle. Read end to end that is eight thousand pixels
          * of undifferentiated evidence, and the eye has nowhere to land.
          *
          * It has always had three acts and never said so: what the instrument
          * concluded, what the money did, and what the year looks like — which
          * is the order this file's own note says the screen is in. Three rules
          * with a label on each is what makes that order visible.
          */}
        {/*
          * The money, before anything else.
          *
          * Every brokerage home screen read for this opens with the account's
          * value and its change, then a line, then the ranges — Fidelity,
          * Lightyear, Acorns, Copilot, QuestMobile and Quicken without
          * exception. This screen had the value as small mono text inside the
          * composition chart's centre, which is the one place a reader opening
          * the app is not looking.
          */}
        <div data-reveal>
          <MoneyHero
            value={book.value}
            gain={perf.gain}
            ret={perf.ret}
            curve={view.curve}
            range={RANGE}
            basis={view.provenance.marks}
          />
        </div>

        {wheelPositions.length >= 2 ? (
          <>
            <Act label="The read" note="Every position, and how far it is from breaking even." lead />
            <div data-reveal>
              <BookLead
                positions={wheelPositions}
                bookReturn={book.unrealisedPct ?? 0}
                benchmark={
                  view.index != null ? { label: "S&P 500", ret: view.index * 100 } : null
                }
                value={money(book.value)}
                contributions={view.positions
                  .filter((position) => position.pnl != null)
                  .map((position) => ({ symbol: position.symbol, pnl: position.pnl as number }))}
                money={money}
              />

            </div>
          </>
        ) : null}

        {/*
          * The book as a table, directly under the money.
          *
          * Six portfolio products were looked at before this was added and
          * five of them lead with exactly this object — Monarch, Origin,
          * Quicken, Fey and Kraken all make a holdings table the primary
          * thing on the screen and let the charts sit around it. This
          * dashboard drew the same account three ways and never once as a
          * list of its positions: a chart answers which is biggest and which
          * is up, and cannot answer what a given name is worth, which is the
          * question a holder arrives with.
          */}
        {/*
          * The account in the main column, the commentary in a rail.
          *
          * The night's written reading and the closest trophy used to sit
          * under the wheel, in the full width of the page, which gave a
          * sentence the same claim on the reader as the chart above it. They
          * are commentary — Origin stacks exactly this kind of card in a rail
          * beside the money and it is the right shape for them: a fixed
          * measure, next to the object they are about rather than under it.
          */}
        <div data-reveal>
          <Split
            rail={
              <>
              {/*
                  * The night's written reading, kept.
                  *
                  * It used to sit inside the score hero, and replacing that
                  * block with the wheel would have taken it off the screen
                  * with everything else — which is the state this file's own
                  * note says it spent a long time in, generated every night
                  * and read by nobody but the email. It is the product's own
                  * voice, so it is `--accent` behind a 2px rule, as it was.
                  */}
                {note?.sentence ? (
                  <div className={heroStyles.note}>
                    <p className={heroStyles.noteLine}>{note.sentence}</p>
                    {note.tail ? <p className={heroStyles.noteTail}>{note.tail}</p> : null}
                  </div>
                ) : null}

                {nextTrophy ? (
                  <a className={heroStyles.next} href="/trophies">
                    <span className={heroStyles.nextLabel}>Closest to earning</span>
                    <span className={heroStyles.nextName}>{nextTrophy.name}</span>
                    <span className={heroStyles.nextMeter} aria-hidden="true">
                      <span
                        className={heroStyles.nextFill}
                        style={{
                          transform: `scaleX(${Math.min(1, nextTrophy.have / nextTrophy.need)})`,
                        }}
                      />
                    </span>
                    <span className={`num ${heroStyles.nextCount}`}>
                      {nextTrophy.have} / {nextTrophy.need}
                    </span>
                  </a>
                ) : null}
              </>
            }
          >
            <PositionsTable positions={view.positions} />
          </Split>
        </div>

        {view.positions.filter((position) => position.pnlPct != null).length >= 2 ? (
          <div data-reveal>
            {/*
              * The same book the wheel draws, as a table you can read.
              *
              * A rate on its own is the least useful true thing about a
              * position: *from what, to what* is the sentence a reader wants,
              * and both numbers are already on the ledger. This states them,
              * groups by the provider's industry, and puts the exposure
              * inside the bar — none of which a polar chart has room for.
              */}
            <ReturnBars positions={view.positions} money={money} />
          </div>
        ) : null}

        <Act label="The money" note="Straight off your brokerage, year to date." />

        <div data-reveal>
          <PageHead
            eyebrow="Total value · year to date"
            title={<TotalValue value={book.value} delta={perf.gain} deltaPct={perf.ret} />}
          />
        </div>

        {/*
          * Four figures, each the best one this account can actually answer.
          *
          * Every card here used to state a *closed-trading* statistic — return
          * over a window, win rate over round trips, realised P&L, Sharpe over
          * daily marks — and every one of them is null until a reader has both
          * sold something and been connected long enough to have a curve. An
          * account that connected this week and holds eight positions read as
          * four em-dashes, on a screen sitting on a fully priced book.
          *
          * So each falls back to the figure the same data answers without any
          * history at all: return on cost, positions in profit, unrealised
          * P&L, what it cost. The label changes with the figure — a fallback
          * that kept the old heading would be a different number under the
          * same word, which is worse than the dash it replaced.
          */}
        <Stats>
          <Stat
            label={perf.ret == null ? "Return on cost" : "Return"}
            value={
              perf.ret != null
                ? signedPct(perf.ret * 100)
                : book.unrealisedPct != null
                  ? signedPct(book.unrealisedPct)
                  : "—"
            }
            tone={
              perf.ret != null
                ? perf.ret >= 0
                  ? "moss"
                  : "loss"
                : book.unrealisedPct != null
                  ? book.unrealisedPct >= 0
                    ? "moss"
                    : "loss"
                  : undefined
            }
            tail={
              perf.ret != null
                ? /*
                   * The benchmark line only belongs beside a figure. It was
                   * printed unconditionally, so a reader with no return read
                   * "—" over "vs +13.8% S&P" — a comparison against nothing.
                   */
                  view.index != null
                  ? `vs ${signedPct(view.index * 100)} S&P`
                  : perf.basis === "account"
                    ? "Contributions taken out"
                    : "Buys and sells taken out"
                : book.unrealisedPct != null
                  ? "Against what you paid"
                  : "No cost basis reported"
            }
          />
          {/*
            * ── Win rate ──
            *
            * Profitable round trips over all of them, off the FIFO matches —
            * arithmetic, not a model. It stays null under ten closed trips,
            * because a rate over three is a coin landing heads twice.
            *
            * Below the floor it now says so rather than quietly becoming a
            * different statistic: the reader gets "In profit" as the figure,
            * and the tail names the win rate and how many trips are left
            * before it can be one. A metric that silently swaps for another
            * under the same heading is worse than a dash.
            */}
          <Stat
            label={perf.winRate.pct == null ? "In profit" : "Win rate"}
            value={
              perf.winRate.pct != null
                ? `${perf.winRate.pct}%`
                : book.priced
                  ? `${book.winners}/${book.priced}`
                  : "—"
            }
            tone={perf.winRate.pct != null ? (perf.winRate.pct >= 50 ? "moss" : undefined) : undefined}
            tail={
              perf.winRate.pct != null
                ? `${perf.winRate.wins} of ${perf.winRate.trades} round trips`
                : `Win rate needs ${RATE_FLOOR} closed trips · ${perf.winRate.trades} on file`
            }
          />
          <Stat
            label={perf.sessions.length ? `${window.label} P&L` : "Unrealised P&L"}
            value={
              perf.sessions.length
                ? signedMoney(perf.realised)
                : book.priced
                  ? signedMoney(book.unrealised)
                  : "—"
            }
            tone={
              perf.sessions.length
                ? perf.realised >= 0
                  ? "moss"
                  : "loss"
                : book.priced
                  ? book.unrealised >= 0
                    ? "moss"
                    : "loss"
                  : undefined
            }
            tail={
              perf.sessions.length
                ? `${perf.up} up, ${perf.down} down`
                : book.priced
                  ? "On what you hold"
                  : "Nothing closed in this window"
            }
          />
          <Stat
            label={perf.sharpe == null ? "Cost basis" : "Sharpe"}
            value={
              perf.sharpe != null
                ? perf.sharpe.toFixed(2)
                : book.cost > 0
                  ? money(book.cost)
                  : "—"
            }
            tail={
              perf.sharpe != null
                ? "Annualised, no risk-free rate"
                : book.cost > 0
                  ? `what ${book.positions} ${book.positions === 1 ? "position" : "positions"} cost you`
                  : "Needs a season of marks"
            }
          />
        </Stats>

        {/*
          * The race. Absent — not empty, not estimated — without a market key,
          * without two quotable funds, or without a window the reader's own
          * curve can answer for on the same terms.
          */}
        {view.field ? (
          <Row kind="full">
            <Panel art="race">
              <PanelHead
                eyebrow="The race"
                title={
                  view.field.place == null
                    ? "The field, this year"
                    : view.field.place === 1
                      ? "You are out in front of the field"
                      : `You are ${view.field.place} of ${view.field.of} this year`
                }
              >
                <PanelNote>Year to date · price return</PanelNote>
              </PanelHead>
              <RaceBars field={view.field} />
              {/*
                * ── Why the reader is not on the chart, when they are not ──
                *
                * Drawing five funds under the heading "The field, this year"
                * and saying nothing about the missing row is the failure this
                * whole screen is built to avoid: a reader cannot tell an
                * honest absence from a broken chart, and assumes the second.
                *
                * A return needs two marks on the equity curve to exist at all
                * — a single day has no span to measure over — so an account
                * that connected this week is genuinely unquotable rather than
                * being withheld. That is a sentence, not a silence.
                */}
              {view.field.rows.find((row) => row.you)?.basis === "cost" ? (
                <p className="dashEmpty">
                  Your figure is your book against what you paid for it — real, and with
                  no time in it. The funds are quoted year to date. Two different
                  measurements, drawn together so you are in your own field; yours
                  switches to a year once your curve has two days of marks.
                </p>
              ) : view.field.place == null ? (
                <p className="dashEmpty">
                  Your own row needs either two days of marks or a cost basis your broker
                  reported. The funds race in the meantime.
                </p>
              ) : view.field.rows.find((row) => row.you)?.since ? (
                <p className="dashEmpty">
                  Your figure runs from the day your ledger starts; the funds run from
                  1 January. Two windows, drawn together so you are in your own field.
                </p>
              ) : null}
              <p className="dashProv">
                {fieldLine(
                  view.field.place == null ? view.field.of : view.field.of - 1,
                  view.provenance.asOf ?? "",
                )}
              </p>
            </Panel>
          </Row>
        ) : (
          /*
           * The field, absent, saying why.
           *
           * It used to render nothing at all, which is indistinguishable from
           * a broken screen: a dashboard that promises a comparison and shows
           * no comparison has to say whether it is missing or refusing. The
           * refusal itself is unchanged — a fund the provider will not quote
           * is dropped rather than drawn at zero, and a six-month figure is
           * never set beside a twelve-month one — because a comparison nobody
           * can check is the one thing this screen must not print.
           */
          <Row kind="full">
            <Panel art="race">
              <PanelHead eyebrow="The race" title="Not a comparison yet" />
              <p className="dashEmpty">
                {view.fieldAbsence === "market-key"
                  ? "No market key on this deployment. Nothing is estimated in the meantime."
                  : "Under two funds could be quoted. A fund nobody will quote is dropped, never drawn at zero."}
              </p>
              <p className="dashProv">DBMF · QAI · MNA · BTAL · SPY</p>
            </Panel>
          </Row>
        )}

        <Row kind="wide">
          {/*
            * The realised chart when there is one, the book itself when there
            * is not.
            *
            * This is the largest panel on the screen and it drew an empty
            * rectangle for every account that had never sold anything — half a
            * fold of nothing, on a page whose whole claim is that it reads a
            * brokerage. What replaces it is not a placeholder: unrealised P&L
            * per position is a real figure off one synced snapshot, and for a
            * reader who only ever buys it is *the* answer to "how is it going".
            */}
          <Panel art="charts" span>
            <PanelHead
              eyebrow={realisedDrawable ? `Daily P&L · ${window.label}` : "Your positions"}
            >
              {realisedDrawable ? <Legend up={perf.up} down={perf.down} /> : null}
            </PanelHead>
            {/*
              * No hero figure, and no percentage either.
              *
              * Both are already on the stat row directly above this panel —
              * "YTD P&L" is the same realised total and "Return" is the same
              * percentage — so the screen was setting one number at 40px twice
              * inside a single scroll, and the return five times in total. The
              * columns are what this panel is for.
              */}
            {realisedDrawable ? (
              <>
                <PnlColumns sessions={perf.sessions} peak={perf.peak} />
                <ChartAxis labels={perf.axis} />
              </>
            ) : unrealisedColumns.length ? (
              /*
                * The same idiom, a different measurement.
                *
                * It drew horizontal bars — honest, and visibly not the chart
                * beside it, so the screen read as though the P&L chart had
                * failed to load. Columns off a zero line are what this panel
                * is: green above, hatched below, largest first. The heading
                * and the tail carry the difference, which is the part that
                * matters — realised is what closing did, this is what holding
                * has done so far.
                */
              <>
                <PnlColumns
                  sessions={unrealisedColumns}
                  peak={Math.max(...unrealisedColumns.map((c) => Math.abs(c.amount)), 1)}
                />
                <ChartAxis labels={unrealisedColumns.slice(0, 6).map((c) => c.date)} />
                <p className="dashProv">
                  Unrealised, position by position, off your latest snapshot · realised
                  columns draw once you sell
                </p>
              </>
            ) : (
              /*
                * Name the condition that is actually true.
                *
                * This said "nothing closed in this window" whatever the
                * reason, and that is only one of three. A reader holding
                * eight names whose broker reported no cost basis was told to
                * sell something — advice that would not have drawn the chart
                * either, on a screen that had just drawn those eight names
                * twice above. An empty state that explains the wrong absence
                * is worse than one that says nothing.
                */
              <p className="dashEmpty">
                {!view.positions.length
                  ? "No priced positions on the last sync. The chart draws once your brokerage reports one."
                  : "Your brokerage reported no cost basis for these positions, so there is no return to draw. Realised columns arrive when you sell."}
              </p>
            )}
          </Panel>

          <Panel art="charts" span>
            {/*
              * ── The map replaced the ring ──
              *
              * A pie can only answer "how much", and to answer even that it
              * needed a ramp of `--signal` and a written exemption from the
              * one-hue-one-meaning rule, because a pie has to colour by
              * *which*. A treemap carries "which" in area and order, so the
              * fill goes back to money: green is up, red is down, and the
              * biggest tile is the name the account is most exposed to.
              */}
            <PanelHead eyebrow="The book" title="Every name, sized and lit">
              <PanelNote>Area is share of the book · fill is return on cost</PanelNote>
            </PanelHead>
            <Heatmap
              grouped
              items={view.positions.map((position) => ({
                symbol: position.symbol,
                value: position.value,
                pnlPct: position.pnlPct,
                sector: position.sector,
              }))}
            />
            {view.concentration ? <p className="dashSentence">{view.concentration}</p> : null}
            {/*
              * The same money at the grain that carries the risk. The map
              * answers "which names"; this answers "which kind of thing", and
              * a book of five evenly-weighted semiconductor names is
              * concentrated in a way no arrangement of five names can show.
              */}
            <SectorMix sectors={view.sectors} cover={view.sectorsCover} />
            {/*
              * Cash is the one part of an account that is definitely not
              * invested, and nothing on this screen said so. Absent rather
              * than zero when the brokerage will not report a balance — that
              * is a fact about the connection, not a holding of nothing.
              */}
            {book.cashShare != null ? (
              <p className="dashProv">
                {(book.cashShare * 100).toFixed(0)}% of the account is uninvested cash
              </p>
            ) : null}
          </Panel>
        </Row>

        {/*
          * Two questions the columns above cannot answer, and both are absent
          * rather than empty when the ledger cannot answer them either.
          *
          * `dailyPnl` is a *sparse* series — only days that closed something
          * appear — so an account that has never sold has one cumulative point
          * and a year of blank cells. The view gates both on `MIN_SESSIONS`,
          * which is the engine's own floor for reporting a pattern at all.
          */}
        {/*
          * The running total — or, for an account that has never sold, the
          * account's own value instead.
          *
          * `cumulative` is realised P&L, so it is empty until eight sessions
          * have closed something. That is most new accounts and *every*
          * buy-and-hold one, and the block simply vanished for them: the
          * widest panel on the screen, absent, on an account with a perfectly
          * good curve behind it.
          *
          * The substitute is value rather than profit and is labelled as
          * value, because a deposit moves it exactly like a gain does. Calling
          * it P&L would be the one thing this screen must not do; calling it
          * what it is costs nothing.
          */}
        {/*
          * ── The day-one line: what you have put in ──
          *
          * An equity curve needs two days of *our* marks, which an account
          * that connected today does not have. What it does have is every
          * transaction the brokerage remembers, and cumulative net invested is
          * a real line off exactly that — one that moves when the reader acts
          * rather than when the market does.
          *
          * It is labelled as what it is. Calling money-in an equity curve
          * would be the single most misleading thing this screen could do, so
          * the head says "What you have put in" and the tail says it does not
          * move with the market.
          */}
        {!view.cumulative.length && view.curve.length < 2 && invested.length >= 2 ? (
          <Row kind="full">
            <Panel>
              <PanelHead eyebrow="What you have put in">
                <PanelNote>Cumulative, from your own transactions</PanelNote>
              </PanelHead>
              <EquityCurve series={invested} tone="signal" />
              <p className="dashProv">
                Money in, not value — this moves when you buy or sell, never when the
                market does. Your value curve starts once there are two days of marks.
              </p>
            </Panel>

          </Row>
        ) : null}

        {/*
          * And when even that is not there — a brokerage that handed over one
          * day of transactions — the block still says which condition it is
          * waiting on rather than vanishing.
          */}
        {!view.cumulative.length && view.curve.length < 2 && invested.length < 2 ? (
          <Row kind="full">
            <Panel>
              <PanelHead eyebrow="Your curve" title="One day on the clock" />
              <p className="dashEmpty">
                A line needs two days. Your brokerage has handed over one so far;
                tomorrow&rsquo;s sync draws the second, and the curve starts from there.
              </p>
            </Panel>
          </Row>
        ) : null}

        {view.cumulative.length || view.curve.length >= 2 ? (
          <Row kind="wide">
            <Panel>
              {view.cumulative.length ? (
                <>
                  {/*
                    * No hero figure here. The running total ends on exactly
                    * the number the P&L stat states four blocks up, and this
                    * screen printed it twice at 40px — the same measurement,
                    * in the same window, on the same page. The curve is what
                    * this panel is for; the figure is already said.
                    */}
                  <PanelHead eyebrow={`Cumulative P&L · ${window.label}`}>
                    <PanelNote>Running total, session by session</PanelNote>
                  </PanelHead>
                  <PnlWave points={view.cumulative} />
                  <p className="dashProv">Realised only · moves when a position closes</p>
                </>
              ) : (
                <>
                  {/* Same reason: this ends on the total value at the head of the act. */}
                  <PanelHead eyebrow="Account value">
                    <PanelNote>Every day your brokerage reported one</PanelNote>
                  </PanelHead>
                  <EquityCurve series={view.curve} />
                  <p className="dashProv">
                    Value, not profit — a deposit lifts it like a gain does
                  </p>
                </>
              )}
            </Panel>

            <Panel art="grid">
              <PanelHead eyebrow="The year in days" />
              {view.calendar.length ? <HeatGrid days={view.calendar} /> : null}
              <p className="dashProv">
                One day&apos;s realised P&amp;L · empty means nothing closed
              </p>
            </Panel>
          </Row>
        ) : null}

        <Act label="The year" note="What your own history has proved so far." />

        {/*
          * The one place the score has a *history* rather than a value, and
          * the twin of the money calendar above it. It reads the same band
          * table the streaks do — before those were reconciled, the same
          * Tuesday could be "inside your rules" in the ring and a pale cell
          * in the grid beside it.
          */}
        {/*
          * The grid waits for eight scored nights, because one lit cell in a
          * field of empties reads as a broken chart rather than as a young
          * account. What it does not do any more is wait *silently* — an act
          * headed "The year" with nothing under it says less than a sentence
          * naming the count would.
          */}
        {/*
          * ── The year the brokerage remembers, until we have one of our own ──
          *
          * The scored grid waits for eight nights, because one lit cell in a
          * field of empties reads as a broken chart. But the *ledger* has a
          * year in it on day one — often several — so the act is not empty
          * while it waits: every day the reader traded, off the transaction
          * record, banded on counts.
          *
          * It carries no direction. A busy day is not an up day, and handing
          * this grid a `dir` would be the chart claiming something the count
          * cannot know.
          */}
        {(!view.read || view.read.scoredDays < MIN_SCORED_DAYS) && activity.length ? (
          <Row kind="full">
            <Panel art="grid">
              <PanelHead eyebrow="Every day you traded">
                <PanelNote>
                  {view.read
                    ? `${view.read.scoredDays} of ${MIN_SCORED_DAYS} nights scored`
                    : "Straight off your ledger"}
                </PanelNote>
              </PanelHead>
              <HeatGrid days={activity} ramp="count" />
              <p className="dashProv">
                Trades per day, off your own transactions · the scored grid replaces this
                once there are {MIN_SCORED_DAYS} nights on file
              </p>
            </Panel>
          </Row>
        ) : null}

        {view.read && view.read.scoredDays >= MIN_SCORED_DAYS ? (
          <Row kind="full">
            <Panel art="grid">
              <PanelHead eyebrow="Every scored day">
                <PanelNote>
                  {view.read.scoredDays.toLocaleString("en-US")} scored ·{" "}
                  {view.read.streaks[0]
                    ? `${view.read.streaks[0].days} ${view.read.streaks[0].name}`
                    : "no run live today"}
                </PanelNote>
              </PanelHead>
              <HeatGrid days={view.read.heat} />
              <p className="dashProv">
                One night&apos;s score · empty means nothing scored
              </p>
            </Panel>
          </Row>
        ) : null}

        {/*
          * The findings, drawn.
          *
          * They were three rows inside one panel, each with its chart shrunk
          * to a 104px chip beside the sentence it was evidence for — so the
          * reader could see that something had been measured and never what.
          * Each is a card now: the chart across the top of its own plate, the
          * reading under it. The row shape follows the count, because a
          * third-width card sitting alone in a three-column grid reads as two
          * cards that failed to load.
          */}
        {insights.length ? (
          <Row kind={insights.length >= 3 ? "thirds" : insights.length === 2 ? "halves" : "full"}>
            {insights.slice(0, 3).map((pattern, i) => (
              <InsightCard
                key={pattern.key}
                delay={50 + i * 80}
                eyebrow={INSIGHT_EYEBROW[pattern.kind]}
                range={pattern.range}
                chart={
                  pattern.chart.type === "weekday" ? (
                    <WeekdayBars cells={pattern.chart.cells} worst={pattern.chart.worst} />
                  ) : pattern.chart.type === "holds" ? (
                    <HoldMeters
                      winners={pattern.chart.winners}
                      losers={pattern.chart.losers}
                    />
                  ) : (
                    <span className="dashImpact" data-tone={pattern.tone}>
                      {pattern.impact != null ? signedMoney(pattern.impact) : "—"}
                    </span>
                  )
                }
                title={pattern.title}
                body={pattern.body}
              />
            ))}
          </Row>
        ) : (
          <Row kind="full">
            <Panel art="findings">
              <PanelHead eyebrow="Insights this week" />
              {/*
                * A refusal with a door, rather than a refusal.
                *
                * "Nothing has cleared a sample floor yet" is true and it is
                * the end of the conversation. The behaviour findings do need a
                * history — but the book itself is readable now, and
                * `/insights` says so on its own first band, so this points at
                * it instead of stopping.
                */}
              <p className="dashEmpty">
                No behaviour pattern has cleared its sample floor yet — those need a
                history to be anything but a coincidence. What your book already says is
                on the insights screen.
              </p>
              <p className="dashProv">
                <Link href="/insights">Read what your book says →</Link>
              </p>
            </Panel>
          </Row>
        )}

        <Row kind="full">
          {/*
            * The door, not the tally. The count moved to the set at the foot
            * of the page, where twelve frames say it better than a sentence
            * can — printing "9 of 12" in both places is one screen making the
            * same statement twice, in the weaker form.
            */}
          {/*
            * The hero is the year when there is no return to put there.
            *
            * It was an em dash — a 56px placeholder on a saturated gradient,
            * which renders as a blank space and reads as a figure that failed
            * to load. An account with one day of marks has no return, and the
            * year is the thing this card is actually about: unambiguously
            * true, and it needs no ledger to say.
            */}
          <WrappedPromo
            year={String(view.wrapped.year)}
            headline={
              perf.ret == null ? String(view.wrapped.year) : signedPct(perf.ret * 100)
            }
            sub={
              perf.ret == null
                ? `${view.wrapped.earned} of ${view.wrapped.total} cards so far, built from what your brokerage has handed over`
                : "Your year, read straight off your brokerage"
            }
            pills={view.wrapped.archetype ? [view.wrapped.archetype] : []}
            ready={view.wrapped.earned > 0}
          />
        </Row>
        {/*
          * The set, last, and it is the only block on the screen that is about
          * what happens next. Twelve frames and which the ledger has proved —
          * the count used to be a sentence on a promo tile, which is the least
          * legible form a collection can take.
          */}
        <div data-reveal>
          <Collection year={view.wrapped.year} earnedNos={view.wrapped.earnedNos} />
        </div>
      </Page>
    </>
  );
}
