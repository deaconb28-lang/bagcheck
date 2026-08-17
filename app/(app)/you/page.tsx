import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { dashboardFor, fieldLine, rangeOf } from "@/lib/portfolio/load";
import type { RangeKey } from "@/lib/portfolio/types";
import { EmptyState } from "@/components/app/EmptyState";
import { FirstScore } from "@/components/app/FirstScore";
import { PageGrid } from "@/components/app/PageGrid";
import { AppNav } from "@/components/app/AppNav";
import { shellUser } from "@/components/app/shellUser";
import { SignInCta } from "@/components/app/SignInCta";
import { SyncDialog } from "@/components/app/SyncDialog";
import { trialLine, trialState } from "@/lib/tiers";
import {
  Chip,
  Chips,
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
  AllocationDonut,
  ChartAxis,
  HoldingBars,
  HoldMeters,
  Legend,
  PnlColumns,
  SectorMix,
  WeekdayBars,
} from "@/components/dash/Charts";
import { InsightRow, WrappedPromo } from "@/components/dash/Cards";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "45d", label: "45D" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "ALL" },
];

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
  const { connected, range: rangeParam } = await searchParams;
  const range: RangeKey = rangeOf(rangeParam);

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
          eyebrow="bagcheck"
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to see your dashboard"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : isAuthConfigured()
                ? "Your P&L, your holdings, your year and the patterns your own history is hiding."
                : "Sign-in is not configured on this deployment yet."
          }
          actions={[{ label: "Connect a brokerage", href: "/start", ghost: true }]}
        >
          {userId ? null : <SignInCta />}
        </EmptyState>
      </PageGrid>
    );
  }

  const data = await loadScreen(userId, 400);
  const latest = data.scores[0] ?? null;

  if (!latest && !data.holdings.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="bagcheck"
          icon={data.connection ? "waiting" : "connect"}
          title={data.connection ? "Nothing read yet" : "Connect a brokerage"}
          body={
            data.connection
              ? `Your ledger holds ${data.transactionCount.toLocaleString("en-US")} transactions. Scoring reads them and builds the dashboard.`
              : "One tap via SnapTrade, read-only. Positions and history arrive together."
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
  const [{ view }, user] = await Promise.all([
    dashboardFor(userId, range, data),
    shellUser(),
  ]);
  const { book, performance: perf, window } = view;

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
        <div data-reveal>
          <PageHead eyebrow="Total value" title={<TotalValue value={book.value} delta={perf.gain} deltaPct={perf.ret} />}>
            <Chips>
              {RANGES.map((option) => (
                <Chip key={option.key} href={`/you?range=${option.key}`} active={option.key === range}>
                  {option.label}
                </Chip>
              ))}
            </Chips>
          </PageHead>
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
                    ? "Your account, contributions taken out."
                    : "Your invested book, buys and sells taken out."
                : book.unrealisedPct != null
                  ? "Unrealised, against what you paid."
                  : "Your brokerage reports no cost basis."
            }
          />
          <Stat
            label={perf.winRate.pct == null ? "In profit" : "Win rate"}
            value={
              perf.winRate.pct != null
                ? `${perf.winRate.pct}%`
                : book.priced
                  ? `${book.winners}/${book.priced}`
                  : "—"
            }
            tail={
              perf.winRate.pct != null
                ? `${perf.winRate.wins} of ${perf.winRate.trades} round trips`
                : book.priced
                  ? `positions up right now${book.priced < book.positions ? `, of ${book.priced} priced` : ""}`
                  : "No position reports a P&L yet."
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
                  ? "On what you hold, nothing sold yet."
                  : "Nothing has closed in this window."
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
                ? "Annualised on daily marks, no risk-free rate."
                : book.cost > 0
                  ? `what ${book.positions} ${book.positions === 1 ? "position" : "positions"} cost you`
                  : "Needs a season of daily marks."
            }
          />
        </Stats>

        {/*
          * The race. Absent — not empty, not estimated — without a market key,
          * without two quotable funds, or without a window the reader's own
          * curve can answer for on the same terms.
          */}
        {view.field && view.field.place != null ? (
          <Row kind="full">
            <Panel>
              <PanelHead
                eyebrow="The race"
                title={
                  view.field.place === 1
                    ? "You are out in front of the field"
                    : `You are ${view.field.place} of ${view.field.of} this year`
                }
              >
                <PanelNote>Year to date · price return</PanelNote>
              </PanelHead>
              <RaceBars field={view.field} />
              <p className="dashProv">{fieldLine(view.field.of - 1, view.provenance.asOf ?? "")}</p>
            </Panel>
          </Row>
        ) : null}

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
          <Panel>
            <PanelHead
              eyebrow={perf.sessions.length ? `Daily P&L · ${window.label}` : "Your positions"}
            >
              {perf.sessions.length ? <Legend up={perf.up} down={perf.down} /> : null}
            </PanelHead>
            <div className="dashFigureRow">
              <span className={"num dashFigure"}>
                {perf.sessions.length
                  ? signedMoney(perf.realised)
                  : book.priced
                    ? signedMoney(book.unrealised)
                    : "—"}
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
                  Unrealised, off your latest snapshot · the daily chart draws itself
                  the first time a position is sold
                </p>
              </>
            ) : (
              <p className="dashEmpty">
                Nothing has closed in this window. The chart draws itself the first
                time a position is sold.
              </p>
            )}
          </Panel>

          <Panel>
            <PanelHead eyebrow="Allocation" />
            <AllocationDonut
              slices={view.allocation}
            />
            {view.concentration ? <p className="dashSentence">{view.concentration}</p> : null}
            {/*
              * The same money at the grain that carries the risk. The ring
              * answers "which names"; this answers "which kind of thing", and
              * a book of five evenly-weighted semiconductor names is
              * concentrated in a way no ring of five equal arcs can show.
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

        <Row kind="thirds">
          <Panel span>
            <PanelHead eyebrow="Insights this week">
              {view.patterns.length ? (
                <span className="dashNew">{view.patterns.length} on file</span>
              ) : null}
            </PanelHead>

            {/*
              * One list, three kinds. The view shapes each pattern — including
              * the data its thumbnail draws — so this loop never branches on
              * where a pattern came from.
              */}
            {view.patterns.length ? (
              <div className="dashInsights">
                {view.patterns.slice(0, 3).map((pattern, i) => (
                  <InsightRow
                    key={pattern.key}
                    delay={50 + i * 80}
                    thumb={
                      pattern.chart.type === "weekday" ? (
                        <WeekdayBars cells={pattern.chart.cells} worst={pattern.chart.worst} />
                      ) : pattern.chart.type === "holds" ? (
                        <HoldMeters
                          winners={pattern.chart.winners}
                          losers={pattern.chart.losers}
                          compact
                        />
                      ) : (
                        <span className="dashImpact" data-tone={pattern.tone}>
                          {pattern.impact != null ? signedMoney(pattern.impact) : "—"}
                        </span>
                      )
                    }
                    title={pattern.title}
                    body={pattern.body}
                    range={pattern.range}
                  />
                ))}
              </div>
            ) : (
              <p className="dashEmpty">
                Nothing has cleared a sample floor yet. A pattern is reported when
                your own history can prove it, and not before.
              </p>
            )}
          </Panel>

          <WrappedPromo
            year={String(view.wrapped.year)}
            headline={perf.ret == null ? "—" : signedPct(perf.ret * 100)}
            sub={
              view.wrapped.archetype
                ? `${view.wrapped.archetype} · ${view.wrapped.earned} of ${view.wrapped.total} cards`
                : `${view.wrapped.earned} of ${view.wrapped.total} cards earned`
            }
            pills={view.wrapped.archetype ? [view.wrapped.archetype] : []}
            ready={view.wrapped.earned > 0}
          />
        </Row>
      </Page>
    </>
  );
}
