import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import { accessFor, factsFrom, getDailyInsight, isDbConfigured, loadScreen, syncClock, wrappedOpenedAt } from "@/lib/db";
import { dashboardFor, fieldLine } from "@/lib/portfolio/load";
import { RATE_FLOOR } from "@/lib/portfolio/view";
import type { Pattern, RangeKey } from "@/lib/portfolio/types";
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
  Page,
  PageHead,
  Panel,
  PanelHead,
  PanelNote,
  Row,
  Stat,
  Stats,
  TotalValue,
  money,
  signedMoney,
  signedPct,
} from "@/components/dash/Chrome";
import { RaceBars } from "@/components/dash/RaceBars";
import {
  ChartAxis,
  HoldingBars,
  HoldMeters,
  Legend,
  PnlColumns,
  PnlWave,
  SectorMix,
  WeekdayBars,
} from "@/components/dash/Charts";
import { InsightCard, WrappedPromo } from "@/components/dash/Cards";
import { Heatmap } from "@/components/dash/Heatmap";
import { WrappedReady } from "@/components/dash/WrappedReady";
import { ScoreHero } from "@/components/dash/ScoreHero";
import { Collection } from "@/components/dash/Collection";
import { CountUp, EquityCurve, HeatGrid } from "@/components/idioms";

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
const RANGE: RangeKey = "ytd";

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
  searchParams: Promise<{ connected?: string }>;
}) {
  const userId = await getUserId();
  const { connected } = await searchParams;

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
  const [{ view }, user, note, openedWrapped] = await Promise.all([
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

        {view.read ? (
          <div data-reveal>
            <ScoreHero
              read={view.read}
              year={view.wrapped.year}
              allocation={view.allocation}
              note={note}
            />
          </div>
        ) : null}

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
                * The reader is always in the field now. Where their curve
                * starts after the year does, the mismatch is stated rather
                * than used as a reason to remove them: their row carries the
                * date and this line says what it means.
                */}
              {view.field.rows.find((row) => row.you)?.since ? (
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
          <Panel art="charts">
            <PanelHead
              eyebrow={perf.sessions.length ? `Daily P&L · ${window.label}` : "Your positions"}
            >
              {perf.sessions.length ? <Legend up={perf.up} down={perf.down} /> : null}
            </PanelHead>
            <div className="dashFigureRow">
              <span className={"num dashFigure"}>
                {perf.sessions.length ? (
                  <CountUp value={perf.realised} kind="signedMoney" />
                ) : book.priced ? (
                  <CountUp value={book.unrealised} kind="signedMoney" />
                ) : (
                  "—"
                )}
              </span>
              {perf.sessions.length && perf.ret != null ? (
                <span className="dashFigurePct" data-tone={perf.ret >= 0 ? "moss" : "loss"}>
                  {signedPct(perf.ret * 100)}
                </span>
              ) : !perf.sessions.length && book.unrealisedPct != null ? (
                <span className="dashFigurePct" data-tone={book.unrealisedPct >= 0 ? "moss" : "loss"}>
                  {signedPct(book.unrealisedPct)}
                </span>
              ) : null}
            </div>
            {perf.sessions.length ? (
              <>
                <PnlColumns sessions={perf.sessions} peak={perf.peak} />
                <ChartAxis labels={perf.axis} />
              </>
            ) : view.positions.length ? (
              <>
                <HoldingBars rows={view.positions} money={signedMoney} />
                <p className="dashProv">
                  Unrealised, off your latest snapshot
                </p>
              </>
            ) : (
              <p className="dashEmpty">
                Nothing closed in this window. The chart draws when you sell.
              </p>
            )}
          </Panel>

          <Panel art="charts">
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
            <PanelHead eyebrow="The book" title="Every name, sized and lit" />
            <Heatmap
              items={data.holdings.map((h) => ({
                symbol: h.symbol,
                value: h.value ?? 0,
                pnlPct: h.pnlPct,
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
        {view.cumulative.length || view.curve.length >= 2 ? (
          <Row kind="wide">
            <Panel>
              {view.cumulative.length ? (
                <>
                  <PanelHead eyebrow={`Cumulative P&L · ${window.label}`}>
                    <PanelNote>Running total, session by session</PanelNote>
                  </PanelHead>
                  <div className="dashFigureRow">
                    <span className="num dashFigure">
                      <CountUp
                        value={view.cumulative[view.cumulative.length - 1].total}
                        kind="signedMoney"
                      />
                    </span>
                  </div>
                  <PnlWave points={view.cumulative} />
                  <p className="dashProv">Realised only · moves when a position closes</p>
                </>
              ) : (
                <>
                  <PanelHead eyebrow="Account value">
                    <PanelNote>Every day your brokerage reported one</PanelNote>
                  </PanelHead>
                  <div className="dashFigureRow">
                    <span className="num dashFigure">
                      <CountUp value={view.curve[view.curve.length - 1].value} kind="money" />
                    </span>
                  </div>
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

        {/*
          * The one place the score has a *history* rather than a value, and
          * the twin of the money calendar above it. It reads the same band
          * table the streaks do — before those were reconciled, the same
          * Tuesday could be "inside your rules" in the ring and a pale cell
          * in the grid beside it.
          */}
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
              <p className="dashEmpty">Nothing has cleared a sample floor yet.</p>
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
          <WrappedPromo
            year={String(view.wrapped.year)}
            headline={perf.ret == null ? "—" : signedPct(perf.ret * 100)}
            sub="Your year, read straight off your brokerage"
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
