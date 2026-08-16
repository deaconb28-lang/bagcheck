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
  signedMoney,
  signedPct,
} from "@/components/dash/Chrome";
import { Race } from "@/components/dash/Race";
import {
  AllocationDonut,
  ChartAxis,
  HoldMeters,
  Legend,
  PnlColumns,
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

  const { view } = await dashboardFor(userId, range);
  const { book, performance: perf, window } = view;

  return (
    <>
      {syncDialog}
      <AppNav
        active="dash"
        accounts={view.accounts}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        user={await shellUser()}
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

        <Stats>
          <Stat
            label="Return"
            value={perf.ret == null ? "—" : signedPct(perf.ret * 100)}
            tone={perf.ret == null ? undefined : perf.ret >= 0 ? "moss" : "loss"}
            tail={
              view.index == null
                ? perf.basis === "account"
                  ? "Your account, contributions taken out."
                  : "Your invested book, buys and sells taken out."
                : `vs ${signedPct(view.index * 100)} S&P`
            }
          />
          <Stat
            label="Win rate"
            value={perf.winRate.pct == null ? "—" : `${perf.winRate.pct}%`}
            tail={
              perf.winRate.pct == null
                ? `${perf.winRate.trades} closed — needs ten to be a rate.`
                : `${perf.winRate.wins} of ${perf.winRate.trades} round trips`
            }
          />
          <Stat
            label={`${window.label} P&L`}
            value={perf.sessions.length ? signedMoney(perf.realised) : "—"}
            tone={perf.sessions.length ? (perf.realised >= 0 ? "moss" : "loss") : undefined}
            tail={
              perf.sessions.length
                ? `${perf.up} up, ${perf.down} down`
                : "Nothing has closed in this window."
            }
          />
          <Stat
            label="Sharpe"
            value={perf.sharpe == null ? "—" : perf.sharpe.toFixed(2)}
            tail={
              perf.sharpe == null
                ? "Needs a season of daily marks."
                : "Annualised on daily marks, no risk-free rate."
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
              <Race field={view.field} />
              <p className="dashProv">{fieldLine(view.field.of - 1, view.provenance.asOf ?? "")}</p>
            </Panel>
          </Row>
        ) : null}

        <Row kind="wide">
          <Panel>
            <PanelHead eyebrow={`Daily P&L · ${window.label}`}>
              <Legend up={perf.up} down={perf.down} />
            </PanelHead>
            <div className="dashFigureRow">
              <span className={"num dashFigure"}>{perf.sessions.length ? signedMoney(perf.realised) : "—"}</span>
              {perf.ret != null ? (
                <span className="dashFigurePct" data-tone={perf.ret >= 0 ? "moss" : "loss"}>
                  {signedPct(perf.ret * 100)}
                </span>
              ) : null}
            </div>
            {perf.sessions.length ? (
              <>
                <PnlColumns sessions={perf.sessions} peak={perf.peak} />
                <ChartAxis labels={perf.axis} />
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
