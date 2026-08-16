import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { isMarketConfigured, peerReturnsYtd } from "@/lib/market";
import { investmentFlows, raceField } from "@/lib/returns";
import {
  dailyRealised,
  holdSplit,
  periodMove,
  sharpe,
  spread,
  weekdayPnl,
  winRate,
  worstWeekday,
} from "@/lib/dash";
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
import { archetypeOf } from "../derive";
import { loadDashboard, RANGES, rangeOf } from "./data";
import type { RangeKey } from "./data";

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

  const view = await loadDashboard(userId, data, range);
  const trips = data.derived?.roundTrips ?? [];

  /* Everything the panels below need, computed once. */
  const move = periodMove(view.curve, investmentFlows(view.flowRows));
  const sessions = dailyRealised(trips).filter((s) => s.date >= view.from);
  const session = spread(sessions);
  const rate = winRate(trips.filter((t) => t.closeDate >= view.from));
  const ratio = sharpe(view.curve);
  const week = weekdayPnl(trips);
  const worst = worstWeekday(week);
  const holds = holdSplit(
    data.derived?.holdTime.winnersMean ?? null,
    data.derived?.holdTime.losersMean ?? null,
  );

  const peers = isMarketConfigured() ? await peerReturnsYtd().catch(() => []) : [];
  const field = view.sameWindow ? raceField(view.ytd, peers) : null;
  const spy = peers.find((peer) => peer.key === "SPY")?.value ?? null;

  const archetype = latest?.components ? archetypeOf(latest.components as never) : null;

  return (
    <>
      {syncDialog}
      <AppNav
        active="dash"
        accounts={data.connection?.accounts.length ?? 0}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        user={await shellUser()}
      />

      <Page>
        <div data-reveal>
          <PageHead eyebrow="Total value" title={<TotalValue value={view.totalValue} delta={move.gain} deltaPct={move.pct} />}>
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
            value={view.ytd == null ? "—" : signedPct(view.ytd * 100)}
            tone={view.ytd == null ? undefined : view.ytd >= 0 ? "moss" : "loss"}
            tail={spy == null ? "Your book, contributions removed." : `vs ${signedPct(spy * 100)} S&P`}
          />
          <Stat
            label="Win rate"
            value={rate.pct == null ? "—" : `${rate.pct}%`}
            tail={
              rate.pct == null
                ? `${rate.trades} closed — needs ten to be a rate.`
                : `${rate.wins} of ${rate.trades} round trips`
            }
          />
          <Stat
            label={`${view.label} P&L`}
            value={sessions.length ? signedMoney(session.total) : "—"}
            tone={sessions.length ? (session.total >= 0 ? "moss" : "loss") : undefined}
            tail={
              sessions.length
                ? `${session.up} up, ${session.down} down`
                : "Nothing has closed in this window."
            }
          />
          <Stat
            label="Sharpe"
            value={ratio == null ? "—" : ratio.toFixed(2)}
            tail={
              ratio == null
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
        {field && field.place != null ? (
          <Row kind="full">
            <Panel>
              <PanelHead
                eyebrow="The race"
                title={
                  field.place === 1
                    ? "You are out in front of the field"
                    : `You are ${field.place} of ${field.of} this year`
                }
              >
                <PanelNote>Year to date · price return</PanelNote>
              </PanelHead>
              <Race field={field} />
            </Panel>
          </Row>
        ) : null}

        <Row kind="wide">
          <Panel>
            <PanelHead eyebrow={`Daily P&L · ${view.label}`}>
              <Legend up={session.up} down={session.down} />
            </PanelHead>
            <div className="dashFigureRow">
              <span className={"num dashFigure"}>{sessions.length ? signedMoney(session.total) : "—"}</span>
              {view.ytd != null ? (
                <span className="dashFigurePct" data-tone={view.ytd >= 0 ? "moss" : "loss"}>
                  {signedPct(view.ytd * 100)}
                </span>
              ) : null}
            </div>
            {sessions.length ? (
              <>
                <PnlColumns sessions={sessions} peak={session.peak} />
                <ChartAxis labels={view.axis} />
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
              slices={view.holdings.map((h) => ({
                key: h.symbol,
                label: h.symbol,
                value: h.value ?? 0,
              }))}
            />
            {view.concentration ? <p className="dashSentence">{view.concentration}</p> : null}
          </Panel>
        </Row>

        <Row kind="thirds">
          <Panel span>
            <PanelHead eyebrow="Insights this week">
              {view.findings.length ? (
                <span className="dashNew">{view.findings.length} on file</span>
              ) : null}
            </PanelHead>

            {view.findings.length || worst || holds.ratio ? (
              <div className="dashInsights">
                {worst ? (
                  <InsightRow
                    delay={50}
                    thumb={<WeekdayBars cells={week} worst={worst.day} />}
                    title={`${worst.day}days are your worst day`}
                    body={`${worst.day} closes have booked ${signedMoney(worst.amount)} across ${worst.trades} round ${worst.trades === 1 ? "trip" : "trips"}.`}
                    range={view.label}
                  />
                ) : null}

                {holds.ratio && holds.winners != null && holds.losers != null ? (
                  <InsightRow
                    delay={130}
                    thumb={<HoldMeters winners={holds.winners} losers={holds.losers} compact />}
                    title={
                      holds.direction === "cuts-winners"
                        ? `You cut winners ${holds.ratio.toFixed(1)}× faster`
                        : `You hold winners ${holds.ratio.toFixed(1)}× longer`
                    }
                    body={`Winners stay in the book ${Math.round(holds.winners)} days on average, losers ${Math.round(holds.losers)}.`}
                    range="All"
                  />
                ) : null}

                {view.findings.slice(0, 2).map((finding, i) => (
                  <InsightRow
                    key={finding.key}
                    delay={210 + i * 80}
                    thumb={
                      <span className="dashImpact" data-tone={finding.impact == null ? undefined : finding.impact >= 0 ? "moss" : "loss"}>
                        {finding.impact != null ? signedMoney(finding.impact) : "—"}
                      </span>
                    }
                    title={finding.sentence}
                    body={finding.evidence}
                    range="All"
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
            year={String(view.year)}
            headline={view.ytd == null ? "—" : signedPct(view.ytd * 100)}
            sub={
              archetype
                ? `${archetype.name} · ${rate.trades} round ${rate.trades === 1 ? "trip" : "trips"}`
                : `${rate.trades} round ${rate.trades === 1 ? "trip" : "trips"} this year`
            }
            pills={[
              ...(archetype ? [archetype.name] : []),
              ...(holds.losers != null ? [`${Math.round(holds.losers)}-day hold`] : []),
            ]}
            ready={view.earned > 0}
          />
        </Row>
      </Page>
    </>
  );
}
