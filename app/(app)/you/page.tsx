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
  Panel,
  PanelHead,
  PanelNote,
  Row,
  Stat,
  Stats,
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
import { nextUp, trophiesFrom } from "@/lib/trophies";
import { activityCalendar, investedCurve, positionColumns } from "@/lib/dayone";
import { WrappedReady } from "@/components/dash/WrappedReady";
import { BookLead } from "@/components/dash/BookLead";
import { PositionsTable } from "@/components/dash/PositionsTable";
import { MoneyHero } from "@/components/dash/MoneyHero";
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
          * ── Four acts ──
          *
          * The page is a dozen plates deep and every one of them is the same
          * near-black rectangle. Read end to end that is eight thousand pixels
          * of undifferentiated evidence, and the eye has nowhere to land.
          *
          * It was three acts — the read, the money, the year — and the middle
          * one had quietly swallowed a fourth. Since the money moved to the
          * top of the screen, "the money" was carrying the account's value,
          * four stats, the field, the daily columns *and* every reading of the
          * book: the wheel, a contribution list, the positions table, a return
          * chart and a treemap. Five drawings of one snapshot under a heading
          * about the brokerage.
          *
          * So the book is its own act, and each act now has one subject: what
          * the brokerage says, what you are holding, what the instrument
          * concluded, and what the year has proved.
          */}
        <Act
          label="The money"
          note="Straight off your brokerage, and what it has done."
          lead
        />

        {/*
          * The money, before anything else.
          *
          * Every brokerage home screen read for this opens with the account's
          * value and its change, then a line, then the ranges — Kraken,
          * Copilot, Coinbase, Binance, Fidelity, Origin and Quicken without
          * exception. This screen had the value as small mono text inside the
          * composition chart's centre, which is the one place a reader opening
          * the app is not looking.
          */}
        <div data-reveal>
          <MoneyHero
            value={book.value}
            gain={perf.gain}
            curve={view.curve}
            range={RANGE}
            fallbackGain={book.unrealised}
            basis={view.provenance.marks}
          />
        </div>

        {/*
          * The one notice this screen has.
          *
          * A reader who has just connected has a deck waiting — the sync
          * builds it now rather than leaving it for whoever opens `/wrapped`
          * first — and nothing here said so. It stops for good the first time
          * the deck is opened; a banner that keeps announcing something you
          * have seen is an advert.
          */}
        {!openedWrapped ? (
          <WrappedReady
            year={view.wrapped.year}
            earned={view.wrapped.earned}
            total={view.wrapped.total}
          />
        ) : null}

        {/*
          * Four figures, and not one of them is the figure directly above.
          *
          * Every card here used to state a *closed-trading* statistic — return
          * over a window, win rate over round trips, realised P&L, Sharpe over
          * daily marks — and every one is null until a reader has both sold
          * something and been connected long enough to have a curve. An
          * account that connected this week and holds eight positions read as
          * four em-dashes, on a screen sitting on a fully priced book. So each
          * falls back to the figure the same data answers with no history at
          * all, and the label changes with the figure: a fallback that kept
          * the old heading would be a different number under the same word.
          *
          * What the fallbacks must not do is land on the hero. Two of them
          * did: the P&L card fell back to unrealised P&L and the return card
          * to return on cost, which are exactly the money and the rate the
          * block above already states — so an account with no closed trades
          * read its own change three times inside four hundred pixels. Each
          * card now falls through to something the hero does not say.
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
            * Below the floor it says so rather than quietly becoming a
            * different statistic: the reader gets "In profit" as the figure,
            * and the tail names the win rate and how many trips are left
            * before it can be one.
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
          {/*
            * Realised P&L, or what the book cost.
            *
            * The fallback was unrealised P&L, which is the exact figure the
            * hero prints when the window closed nothing — the same money, at
            * hero size, twice. Cost basis is a fact about the same snapshot
            * that appears nowhere else on the screen, and it is the other half
            * of the sentence the return card states as a rate.
            */}
          <Stat
            label={perf.sessions.length ? `${window.label} P&L` : "Cost basis"}
            value={
              perf.sessions.length
                ? signedMoney(perf.realised)
                : book.cost > 0
                  ? money(book.cost)
                  : "—"
            }
            tone={
              perf.sessions.length ? (perf.realised >= 0 ? "moss" : "loss") : undefined
            }
            tail={
              perf.sessions.length
                ? `${perf.up} up, ${perf.down} down`
                : book.cost > 0
                  ? `what ${book.positions} ${book.positions === 1 ? "position" : "positions"} cost you`
                  : "No cost basis reported"
            }
          />
          {/*
            * Sharpe, or the shape of the book.
            *
            * This fell back to cost basis, which the card beside it now
            * carries. How many names the account is spread across — and how
            * much of it is sitting in cash — is a complete fact off one
            * snapshot, needs no history, and is stated nowhere else in figures.
            */}
          <Stat
            label={perf.sharpe == null ? "Positions" : "Sharpe"}
            value={
              perf.sharpe != null
                ? perf.sharpe.toFixed(2)
                : book.positions > 0
                  ? String(book.positions)
                  : "—"
            }
            tail={
              perf.sharpe != null
                ? "Annualised, no risk-free rate"
                : book.cashShare != null
                  ? `${(book.cashShare * 100).toFixed(0)}% of the account is uninvested cash`
                  : book.priced > 0
                    ? `${book.priced} priced by your brokerage`
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

        {/*
          * The daily columns, at the width of the page.
          *
          * They shared a row with a treemap of the book, which put the one
          * chart about *time* beside one about *composition* at half width
          * each — and the treemap said what the wheel two acts down already
          * says. The columns get the row.
          */}
        <Row kind="full">
          <Panel art="charts">
            <PanelHead
              eyebrow={realisedDrawable ? `Daily P&L · ${window.label}` : "Your positions"}
            >
              {realisedDrawable ? <Legend up={perf.up} down={perf.down} /> : null}
            </PanelHead>
            {/*
              * No hero figure, and no percentage either. Both are on the stat
              * row directly above this panel, and the money is at the top of
              * the screen. The columns are what this panel is for.
              */}
            {realisedDrawable ? (
              <>
                <PnlColumns sessions={perf.sessions} peak={perf.peak} />
                <ChartAxis labels={perf.axis} />
              </>
            ) : unrealisedColumns.length ? (
              /*
                * The same idiom, a different measurement. Realised is what
                * closing did; this is what holding has done so far, position
                * by position, off the latest snapshot.
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
                * Name the condition that is actually true. This said "nothing
                * closed in this window" whatever the reason, and that is only
                * one of three.
                */
              <p className="dashEmpty">
                {!view.positions.length
                  ? "No priced positions on the last sync. The chart draws once your brokerage reports one."
                  : "Your brokerage reported no cost basis for these positions, so there is no return to draw. Realised columns arrive when you sell."}
              </p>
            )}
          </Panel>
        </Row>

        {/*
          * The running total. Realised only, so it is absent until eight
          * sessions have closed something — which is most new accounts and
          * every buy-and-hold one.
          *
          * What used to fill the gap was an account-value curve, and that is
          * the same series `<MoneyHero>` draws at the top of the page in the
          * same component: one line, twice, on one screen. The two lines below
          * are the ones that are genuinely different — money you put in, and
          * profit you took out.
          */}
        {view.cumulative.length ? (
          <Row kind="full">
            <Panel>
              <PanelHead eyebrow={`Cumulative P&L · ${window.label}`}>
                <PanelNote>Running total, session by session</PanelNote>
              </PanelHead>
              <PnlWave points={view.cumulative} />
              <p className="dashProv">Realised only · moves when a position closes</p>
            </Panel>
          </Row>
        ) : null}

        {/*
          * ── The day-one line: what you have put in ──
          *
          * An equity curve needs two days of *our* marks, which an account
          * that connected today does not have. What it does have is every
          * transaction the brokerage remembers, and cumulative net invested is
          * a real line off exactly that — one that moves when the reader acts
          * rather than when the market does. It is labelled as what it is:
          * calling money-in an equity curve would be the single most
          * misleading thing this screen could do.
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

        {/* ── Act two: what you are holding ── */}
        <Act
          label="The book"
          /*
           * The note used to say "Every position, and how far it is from
           * breaking even", which is a definition of the chart rather than a
           * reason to look at it — a reader who can see a chart does not need
           * to be told what its axes are. This says what they will learn.
           */
          note="Which names are carrying the account, and which are costing it."
        />

        {wheelPositions.length >= 2 ? (
          <div data-reveal>
            <BookLead
              positions={wheelPositions}
              bookReturn={book.unrealisedPct ?? 0}
              benchmark={view.index != null ? { label: "S&P 500", ret: view.index * 100 } : null}
            />
          </div>
        ) : null}

        {/*
          * The same money at the grain that carries the risk.
          *
          * The wheel answers "which names"; this answers "which kind of
          * thing", and a book of five evenly-weighted semiconductor names is
          * concentrated in a way no arrangement of five names can show. It
          * shared a panel with a treemap that drew weight and return over
          * again — the wheel's own two variables in a second geometry — and
          * the treemap is now only on `/holdings`, which leads with it.
          */}
        {view.sectors.length ? (
          <Row kind="full">
            <Panel art="charts">
              <PanelHead eyebrow="The book by industry" title="What kind of thing you own">
                <PanelNote>Share of the priced book</PanelNote>
              </PanelHead>
              <SectorMix sectors={view.sectors} cover={view.sectorsCover} />
              {view.concentration ? <p className="dashSentence">{view.concentration}</p> : null}
            </Panel>
          </Row>
        ) : null}

        {/*
          * The book as a table, at the full width of the page.
          *
          * Five portfolio products were looked at before this was added and
          * every one of them makes a holdings table a primary object —
          * Monarch, Origin, Quicken, Fey and Kraken — and let the charts sit
          * around it. A chart answers which is biggest and which is up, and
          * cannot answer what a given name is worth, which is the question a
          * holder arrives with. It used to sit in a narrowed column beside a
          * rail of commentary, which is six columns of figures in two thirds
          * of the room they need.
          */}
        <div data-reveal>
          <PositionsTable positions={view.positions} />
        </div>

        {/* ── Act three: what the instrument concluded ── */}
        <Act label="The read" note="What your own history says about how you trade." />

        {/*
          * The night's written reading, in the main column.
          *
          * `generateInsight` runs against Anthropic every night, is held
          * character-for-character to the fact pack, and is stored per user
          * per day — and for a long time the only reader it reached was the
          * notify email. It then spent a while in a 340px rail beside a table,
          * which is the right shape for a card and the wrong one for the one
          * sentence this product writes. It is the product's own voice, so it
          * is `--accent` behind a 2px rule.
          */}
        {note?.sentence || nextTrophy ? (
          <div data-reveal>
            {note?.sentence ? (
              <div className={heroStyles.note}>
                <p className={heroStyles.noteLine}>{note.sentence}</p>
                {note.tail ? <p className={heroStyles.noteTail}>{note.tail}</p> : null}
              </div>
            ) : null}

            {/*
              * The closest unearned trophy, on the read's own foot.
              *
              * It spent a while in a 340px rail, and `<a class="next">` is a
              * three-column pill asking for 460 — so a label, a name, a meter
              * and a count were folded into a 300px box with a 999px radius,
              * which renders as a tall lozenge with its own empty half. The
              * foot is the container it was drawn for.
              *
              * It is the reason to open the screen tomorrow, and it is never a
              * date and never a projection: a real subtraction of two counts
              * already on file.
              */}
            {nextTrophy ? (
              <div className={heroStyles.foot}>
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
              </div>
            ) : null}
          </div>
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
                * A refusal with a door, rather than a refusal. The behaviour
                * findings do need a history — but the book itself is readable
                * now, and `/insights` says so on its own first band.
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

        {/* ── Act four: what the year has proved ── */}
        <Act label="The year" note="What your own history has proved so far." />

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
          * The money calendar, beside the scored one rather than beside a
          * curve it has nothing to do with.
          */}
        {view.calendar.length ? (
          <Row kind="full">
            <Panel art="grid">
              <PanelHead eyebrow="The year in days" />
              <HeatGrid days={view.calendar} />
              <p className="dashProv">
                One day&apos;s realised P&amp;L · empty means nothing closed
              </p>
            </Panel>
          </Row>
        ) : null}

        <Row kind="full">
          {/*
            * The door, not the tally. The count is on the set at the foot of
            * the page, where twelve frames say it better than a sentence can.
            *
            * The hero is the year when there is no return to put there: it was
            * an em dash, which renders as a blank on a saturated gradient and
            * reads as a figure that failed to load.
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
          * The set, last, and the only block on the screen about what happens
          * next. Twelve frames and which the ledger has proved.
          */}
        <div data-reveal>
          <Collection year={view.wrapped.year} earnedNos={view.wrapped.earnedNos} />
        </div>
      </Page>
    </>
  );
}
