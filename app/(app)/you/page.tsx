import type { Metadata } from "next";
import Link from "next/link";
import { getUserId, isAuthConfigured } from "@/auth";
import {
  factsFrom,
  getCollections,
  getDailyInsight,
  isDbConfigured,
  loadScreen,
  syncClock,
} from "@/lib/db";
import type { CardDoc } from "@/lib/db";
import {
  fieldProvenance,
  isMarketConfigured,
  peerReturnsYtd,
  refreshHoldings,
} from "@/lib/market";
import { investmentFlows, raceField, ytdReturn } from "@/lib/returns";
import { untaggedQueue } from "@/lib/tags";
import type { UntaggedEntry } from "@/lib/tags";
import { wrappedDeck } from "@/lib/wrapped/year";
import {
  AllocationRing,
  CountUp,
  EquityCurve,
  HeatGrid,
  RaceBars,
  ScoreRing,
  ZeroBarChart,
} from "@/components/idioms";
import type { WaveDay } from "@/components/idioms";
import { TrophyCard } from "@/components/cards/TrophyCard";
import { Avatar, Logo } from "@/components/primitives";
import { BadgeMint } from "@/components/app/BadgeMint";
import { EmptyState } from "@/components/app/EmptyState";
import { FirstScore } from "@/components/app/FirstScore";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { shellUser } from "@/components/app/shellUser";
import { ShareButton } from "@/components/app/ShareButton";
import { SignInCta } from "@/components/app/SignInCta";
import { SyncDialog } from "@/components/app/SyncDialog";
import { TagPrompt } from "@/components/app/TagPrompt";
import { strongLine } from "@/lib/archetypes";
import { TIER_PRICE, can, trialLine, trialState } from "@/lib/tiers";
import {
  archetypeOf,
  currentStreak,
  heatFromScores,
  longestStreak,
  money,
  signedMoney,
  waveSummary,
  weekDelta,
} from "../derive";
import { YearBlock } from "./YearBlock";
import screen from "../screen.module.css";
import styles from "./you.module.css";

function greeting(): string {
  const h = new Date().getUTCHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];

/** "12 June" — a window's opening date, said the way a sentence would say it. */
function monthDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * The dashboard. One screen, and the only one.
 *
 * **It is a performance screen first and a portrait second.** It used to open
 * on one figure and one flat chart and then spend the rest of its height on
 * identity material — which put the least answerable question at the top of a
 * page whose reader arrived asking the most answerable one. The first half is
 * now four blocks of performance: what the last thirty sessions did and where
 * the money is, side by side; the standing figures under them; the year
 * against a field that actually trades; and the book itself, name by name.
 * Only then does the screen ask who that makes them.
 *
 * The order after that is the order a reader asks in. What is my year worth,
 * what have I got to show for it, what does the history say, who does that
 * make me. `/wrapped` is a subpage this opens into — from the button at the
 * top of the page and from the year block itself — rather than a destination
 * anybody has to find on a rail.
 *
 * Nothing here invents anything. The findings block is absent rather than
 * empty when the engine has nothing that clears a sample floor; the equity
 * curve is absent until there are two snapshots to draw a line between; and
 * the race is absent unless the provider quotes at least two real funds and
 * the reader's own curve can answer for a year.
 */
export default async function YouPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const userId = await getUserId();
  const { connected } = await searchParams;
  /*
   * The brokerage callback lands here with ?connected=1 and nothing synced
   * yet, so the dialog is what starts the sync as well as what reports it. It
   * renders over whichever branch below is showing — usually the "no score
   * yet" empty state, which is exactly what it is about to fill in.
   */
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
          eyebrow="Canopy"
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
          eyebrow="Canopy"
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
          {/*
            * A connected account with nothing read is a screen the reader can
            * act on, not a note telling them to wait for a cron. The first
            * sync scores as it finishes, so this is the fallback rather than
            * the usual path.
            */}
          {data.connection ? <FirstScore /> : null}
        </EmptyState>
        {syncDialog}
      </PageGrid>
    );
  }

  const snapshotDate = data.snapshots.reduce<string | null>(
    (newest, s) => (!newest || s.date > newest ? s.date : newest),
    null,
  );
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getUTCFullYear();
  const { rows: holdings, provenance } = isMarketConfigured()
    ? await refreshHoldings(data.holdings, snapshotDate, today)
    : { rows: data.holdings, provenance: `Brokerage synced ${snapshotDate ?? "never"}` };

  const totalValue = holdings.reduce((s, h) => s + (h.value ?? 0), 0);
  const totalCost = holdings.reduce((s, h) => s + (h.cost ?? 0), 0);
  const returnPct = totalCost ? ((totalValue - totalCost) / totalCost) * 100 : null;
  const winners = holdings.filter((h) => (h.pnlPct ?? 0) > 0).length;

  /*
   * The materialised series, not a scan.
   *
   * This block used to rebuild the curve from `data.snapshots`, which
   * `loadAppData` caps at the twenty most recent — so on an account with
   * fourteen months of history the "equity curve" silently drew nineteen
   * days and labelled its own axis with them. Screens read derived; that is
   * the rule, and this is what it is for. The materialised series also
   * forward-fills across days no sync ran, so the line is a picture of the
   * market rather than of when the reader opened the app.
   */
  const series = (data.derived?.equitySeries ?? []).map((p) => ({
    date: p.date,
    value: p.value,
    /*
     * Carried through because the return arithmetic needs it: a forward-filled
     * opening mark cannot contain a trade dated that day and a real snapshot
     * already does, and the two have to be treated differently or the second
     * of January reports every purchase as a gain.
     */
    interpolated: p.interpolated,
  }));

  const components = (latest?.components ?? null) as unknown as Record<string, number> | null;
  const archetype = archetypeOf(components);

  /*
   * Half a year of readings. This is the one place in the product the score
   * has a history rather than a value — the backfill writes one score per day
   * across the whole ledger, so the grid fills in on the first sync instead of
   * growing a cell a day from the moment someone signed up.
   */
  const heat = heatFromScores(data.scores);
  const streak = currentStreak(data.scores);
  const longest = longestStreak(data.scores);

  /*
   * Materialised per sync, so this is a read rather than the full-ledger scan
   * the Patterns screen used to run on every navigation.
   */
  const findings = data.derived?.findings ?? [];

  /*
   * The minted cards, with what they actually say on them.
   *
   * This projected `title`, which is not a field on a card document — the
   * label is `label` — so `m.title ?? m.type` fell through to the kind slug
   * on every row and the block rendered "roundTrip · /c/9f2ab1c4…". A list of
   * internal names and truncated URLs is a debug view of the one surface in
   * the product whose whole point is that it is worth looking at.
   */
  const { cards } = await getCollections();
  const minted = await cards
    .find({ userId })
    .sort({ mintedAt: -1 })
    .limit(8)
    .project<Pick<CardDoc, "type" | "slug" | "label" | "value" | "tail" | "rarity" | "symbol" | "date">>({
      _id: 0,
      type: 1,
      slug: 1,
      label: 1,
      value: 1,
      tail: 1,
      rarity: 1,
      symbol: 1,
      date: 1,
    })
    .toArray();

  /*
   * One capability stands for the plan here: the five move together, so a
   * screen asking about five of them five times would be asking one question
   * badly. The routes still check their own.
   */
  const pro = can({ tier: data.tier }, "publicationExport");
  const newest = minted[0] ?? null;

  /*
   * Everything the screen still has to ask for, in one round.
   *
   * `flowRows` is the only new read, and it is a narrow one: this year's buys
   * and sells, projected to three fields, so the year-to-date figure can take
   * them back out again. A return quoted next to a fund's return has to be a
   * return — buying lifts the equity curve exactly like a gain, and without
   * this query the reader would out-run the whole field by adding to a
   * position.
   *
   * The year block reads the Wrapped pipeline's own cache, so opening the
   * dashboard costs no model call once a year has been built and the deck it
   * shows is character-identical to the one `/wrapped` plays.
   */
  const { transactions, tags } = await getCollections();
  const [recent, taggedDocs, flowRows, insight, peers] = await Promise.all([
    transactions
      .find({ userId, type: { $regex: /buy/i } })
      .sort({ date: -1 })
      .limit(60)
      .project<UntaggedEntry & { externalId: string }>({
        _id: 0,
        externalId: 1,
        symbol: 1,
        date: 1,
        amount: 1,
        units: 1,
        currency: 1,
      })
      .toArray(),
    tags.find({ userId }).project<{ transactionId: string }>({ _id: 0, transactionId: 1 }).toArray(),
    transactions
      .find({
        userId,
        date: { $gte: `${year}-01-01` },
        type: { $regex: /buy|sell/i },
      })
      .project<{ date: string; type: string; amount: number | null }>({
        _id: 0,
        date: 1,
        type: 1,
        amount: 1,
      })
      .toArray(),
    latest
      ? getDailyInsight(
          userId,
          factsFrom(
            latest,
            data.scores[1] ?? null,
            data.scores.slice(0, 7).at(-1) ?? null,
            data.transactionCount,
            data.connection?.accounts.length ?? 0,
          ),
        )
      : Promise.resolve(null),
    /* No key, no field — and no invented one. */
    isMarketConfigured() ? peerReturnsYtd().catch(() => []) : Promise.resolve([]),
  ]);

  const wrapped = await wrappedDeck(userId, year);

  /*
   * The reader's own year, on the same arithmetic the field is quoted on and
   * with the contributions taken back out. Null until the curve has two marks
   * inside the year, in which case the race simply is not on the screen.
   */
  const ytd = ytdReturn(series, investmentFlows(flowRows), year);

  /*
   * A fund's year to date starts on the second of January. A reader whose
   * ledger starts in June has a six-month figure, and putting it in the same
   * unit as a twelve-month one is not a comparison — it is two different
   * measurements drawn at the same scale. The field is absent in that case
   * rather than footnoted: a chart that needs a disclaimer to be true is a
   * chart that is false at a glance.
   *
   * The standing figure is not absent, because a return over a shorter window
   * is a perfectly good number — it is only the *label* that would be wrong.
   * So it says which window it is over.
   */
  const yearCurve = series.filter((p) => p.date.slice(0, 4) === String(year));
  const opened = yearCurve[0]?.date ?? null;
  const sameWindow = opened != null && opened <= `${year}-01-14`;
  const race = sameWindow ? raceField(ytd, peers) : null;

  /*
   * Realised, off the round trips rather than off `dailyPnl`.
   *
   * `dailyPnl.realised` is the *cash amount* of every sell and dividend — the
   * proceeds, not the gain — so a reader who sold half a million dollars of
   * stock for a two-thousand-dollar profit would have read "+$500,000" under a
   * label saying booked. A round trip carries the FIFO-matched `pnl`, which is
   * the figure the word means.
   */
  const yearRealised = (data.derived?.roundTrips ?? [])
    .filter((t) => t.closeDate.slice(0, 4) === String(year))
    .reduce((sum, t) => sum + t.pnl, 0);
  const yearTrips = (data.derived?.roundTrips ?? []).filter(
    (t) => t.closeDate.slice(0, 4) === String(year),
  ).length;

  /*
   * The wave is read, not computed, and it is thirty sessions rather than
   * sixty-three: at the width this chart now runs, sixty-three columns is a
   * texture and thirty is a month you can actually count.
   */
  const wave: WaveDay[] = (data.derived?.dailyPnl ?? [])
    .slice(-30)
    .map((d) => ({ date: d.date, amount: d.realised }));
  const summary = waveSummary(wave);
  const queue = untaggedQueue(
    recent.map((r) => ({
      externalId: r.externalId,
      symbol: r.symbol ?? "—",
      date: r.date ?? "",
      amount: r.amount ?? null,
      units: r.units ?? null,
      currency: r.currency ?? null,
    })),
    new Set(taggedDocs.map((t) => t.transactionId)),
  );
  const delta = weekDelta(data.scores);

  return (
    <>
      {syncDialog}
      <ScreenHeader
        title={greeting()}
        /*
          * The position count moved: the allocation ring holds it in its
          * centre now, which is the one place it is the denominator of
          * something rather than a fact in a list.
          */
        meta={`${data.scores.length} scored days · ${data.transactionCount.toLocaleString("en-US")} transactions`}
        /*
          * Null, like Home's used to be. The read block sets the score at
          * 62px with its own dial partway down this page; a third copy of the
          * same number in the chrome above it is noise.
          */
        score={null}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        tier={data.tier}
        user={await shellUser()}
      />

      <div className={screen.body}>
        <div className={`${screen.grid} ${styles.wide}`}>
          {/*
            * ── The door, at the top ──
            *
            * Wrapped was reachable from one block two thirds of the way down
            * the page. It is the most shareable surface in the product and the
            * thing the landing actually sells, so it gets a door before the
            * reader has scrolled anywhere.
            */}
          <div className={styles.topBar}>
            <span className={styles.asOf}>
              {today} · {year} year to date
            </span>
            <Link href="/wrapped" className={styles.toWrapped}>
              <Play />
              Go to your Wrapped
            </Link>
          </div>

          {/*
            * ── 1 · What the sessions did, and where the money is ──
            *
            * Two blocks, paired — not one block with two idioms in it. Each
            * keeps its own eyebrow, figure, sentence and single idiom, which
            * is the rule; `.pair` only decides that they sit next to each
            * other on a wide screen and stack on a narrow one.
            */}
          <div className={styles.pair}>
            <section id="money" data-reveal className={styles.block}>
              <span className={styles.eyebrow}>Realised P&amp;L</span>
              <div className={styles.headRow}>
                <h2
                  className={`num ${styles.h2}`}
                  data-tone={summary.total >= 0 ? "moss" : "loss"}
                >
                  {wave.length ? <CountUp value={summary.total} kind="signedMoney" /> : "—"}
                </h2>
                {wave.length ? (
                  <ShareButton type="monthlyPnl" label="this chart" size={44} />
                ) : null}
              </div>
              {/*
                * The figure and the sentence answer to the same guard. They
                * did not: one session rendered "+$500" over "nothing has
                * closed yet", which is a screen disagreeing with itself.
                */}
              <p className={styles.lede}>
                {wave.length > 1
                  ? `The last ${wave.length} sessions that closed something — ${summary.green} green, ${summary.red} red. Best ${signedMoney(summary.best)}, worst ${signedMoney(summary.worst)}.`
                  : wave.length === 1
                    ? `One session has closed something so far, on ${monthDay(wave[0].date)}.`
                    : "Nothing has closed yet. The chart draws itself the first time a position is sold."}
              </p>

              {wave.length > 1 ? (
                <div className={styles.chart}>
                  <ZeroBarChart days={wave} height={200} />
                </div>
              ) : null}
            </section>

            <section id="exposure" data-reveal className={styles.block}>
              <span className={styles.eyebrow}>Allocation</span>
              <div className={styles.headRow}>
                <h2 className={`num ${styles.h2}`}>
                  <CountUp value={totalValue} kind="money" />
                </h2>
              </div>
              <p className={styles.lede}>
                {holdings.length
                  ? `Where the book sits today, by market value. ${holdings[0]?.symbol ?? "Your largest name"} is the largest name in it.`
                  : "Nothing is held right now."}
              </p>

              {/*
                * The ring declines to draw under three names — a two-slice
                * donut is a sentence — so the gap it would sit in is not
                * opened either. This asked for `holdings.length` and left 44px
                * of nothing under a lede promising a chart.
                */}
              {holdings.length >= 3 ? (
                <div className={styles.chart}>
                  <AllocationRing
                    slices={holdings.map((h) => ({
                      key: h.symbol,
                      label: h.symbol,
                      value: h.value ?? 0,
                    }))}
                  />
                </div>
              ) : null}
            </section>
          </div>

          {/* ── 2 · Where you stand ── */}
          <section id="standing" data-reveal className={styles.block}>
            <span className={styles.eyebrow}>Standing</span>
            <h2 className={styles.h2}>
              {returnPct == null
                ? "Your book"
                : `${winners} of ${holdings.length} in profit`}
            </h2>
            <p className={styles.lede}>
              Against a cost basis of {money(totalCost)}
              {data.connection?.accounts.length
                ? `, across ${data.connection.accounts.length === 1 ? "one account" : `${data.connection.accounts.length} accounts`} at ${data.connection.accounts.map((a) => a.institution).filter(Boolean).slice(0, 2).join(" and ") || "your brokerage"}`
                : ""}
              .
            </p>

            <div className={styles.figures}>
              {/*
                * The label states the window it actually measured. An account
                * that opened in June has a perfectly good return — what it does
                * not have is a year to date, and calling a six-week figure by
                * that name is the kind of wrong nobody would ever catch.
                */}
              <div className={styles.figure}>
                <span className={styles.figLabel}>
                  {sameWindow || opened == null ? "Year to date" : `Since ${monthDay(opened)}`}
                </span>
                <span
                  className={`num ${styles.figValue}`}
                  data-tone={ytd == null ? undefined : ytd >= 0 ? "moss" : "loss"}
                >
                  {ytd == null ? "—" : <CountUp value={ytd * 100} kind="pct" />}
                </span>
                <span className={styles.figTail}>
                  {ytd == null
                    ? "Needs two marks inside the year."
                    : "On the book, with buys and sells taken out."}
                </span>
              </div>

              <div className={styles.figure}>
                <span className={styles.figLabel}>Return on cost</span>
                <span
                  className={`num ${styles.figValue}`}
                  data-tone={returnPct == null ? undefined : returnPct >= 0 ? "moss" : "loss"}
                >
                  {returnPct == null ? "—" : <CountUp value={returnPct} kind="pct" />}
                </span>
                <span className={styles.figTail}>Unrealised, on the current mark.</span>
              </div>

              <div className={styles.figure}>
                <span className={styles.figLabel}>Realised in {year}</span>
                <span
                  className={`num ${styles.figValue}`}
                  data-tone={yearRealised >= 0 ? "moss" : "loss"}
                >
                  <CountUp value={yearRealised} kind="signedMoney" />
                </span>
                <span className={styles.figTail}>
                  {yearTrips
                    ? `Across ${yearTrips} closed round ${yearTrips === 1 ? "trip" : "trips"}, FIFO matched.`
                    : "Nothing has closed this year."}
                </span>
              </div>

              <div className={styles.figure}>
                <span className={styles.figLabel}>Scored days</span>
                <span className={`num ${styles.figValue}`}>{data.scores.length}</span>
                <span className={styles.figTail}>One reading a day, off your own fills.</span>
              </div>
            </div>

            {series.length > 1 ? (
              <div className={styles.curve}>
                <EquityCurve series={series} />
              </div>
            ) : null}
            <p className={styles.prov}>{provenance}</p>
          </section>

          {/*
            * ── 3 · The race ──
            *
            * The one surface in Canopy that measures the reader against
            * anything other than themselves, which is why it is `--signal` and
            * why every row is a fund with a ticker rather than "hedge funds"
            * in the aggregate. There is no hedge-fund index in this
            * repository and no key for one; what there is are four funds that
            * exist to replicate hedge-fund strategies and publish a price
            * every day, quoted through the same provider as every other mark
            * on the screen. A bar labelled with a number nobody can check is
            * the one thing this screen must not draw.
            *
            * Absent — not empty, not estimated — without a market key, without
            * two quotable funds, or without a year the reader's own curve can
            * answer for.
            */}
          {race && race.place != null ? (
            <section id="race" data-reveal className={styles.block}>
              <span className={styles.eyebrow}>Year to date · the field</span>
              <div className={styles.headRow}>
                <h2
                  className={`num ${styles.h2}`}
                  data-tone={(ytd ?? 0) >= 0 ? "moss" : "loss"}
                >
                  <CountUp value={(ytd ?? 0) * 100} kind="pct" />
                </h2>
                <span className={styles.place}>
                  {ORDINALS[race.place] ?? `${race.place}th`} of {race.of}
                </span>
              </div>
              {/*
                * Descriptive, and no race verbs. The rows are ordered because
                * that is what makes a set of returns readable at a glance;
                * the sentence states a difference between two figures and
                * stops, because the moment it says beat or lead or lag the
                * screen has started rating somebody.
                */}
              <p className={styles.lede}>
                Your year beside four funds built to replicate hedge-fund
                strategies, and the S&amp;P 500.{" "}
                {race.behind == null
                  ? "Nothing in the field returned more this year."
                  : `${race.rows[race.place - 2]?.label ?? "The row above"} returned ${(race.behind * 100).toFixed(1)} points more.`}
              </p>

              <RaceBars field={race} />

              {/*
                * Today, not the sync date. These returns come from the market
                * provider on a six-hour cache and are current whatever the
                * brokerage last said — stamping them with the last sync would
                * date today's bars to a reader's June.
                */}
              <p className={styles.prov}>{fieldProvenance(race.of - 1, today)}</p>
            </section>
          ) : null}

          {/* ── 4 · The book, name by name ── */}
          <section id="holdings" data-reveal className={styles.block}>
            <span className={styles.eyebrow}>Holdings</span>
            <h2 className={styles.h2}>What you are holding</h2>

            <div className={styles.holdings}>
              {holdings.map((h) => {
                const weight = totalValue ? ((h.value ?? 0) / totalValue) * 100 : 0;
                return (
                  <div key={h.symbol} className={styles.holding}>
                    <Logo symbol={h.symbol} size={30} />
                    <div className={styles.holdingName}>
                      <span className={styles.symbol}>{h.symbol}</span>
                      {h.description ? <span className={styles.desc}>{h.description}</span> : null}
                    </div>
                    {/* Weight is neither discipline nor exposure — it is size. */}
                    <div className={styles.weight}>
                      <i style={{ width: `${weight.toFixed(1)}%` }} />
                    </div>
                    <span className={`num ${styles.units}`}>
                      {h.units.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`num ${styles.value}`}>{money(h.value)}</span>
                    <span
                      className={`num ${styles.ret}`}
                      data-tone={h.pnlPct == null ? undefined : h.pnlPct >= 0 ? "moss" : "loss"}
                    >
                      {h.pnlPct == null
                        ? "—"
                        : `${h.pnlPct >= 0 ? "+" : "−"}${Math.abs(h.pnlPct).toFixed(1)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 5 · The year, and the door into it ── */}
          {wrapped ? <YearBlock year={String(year)} cards={wrapped.cards} /> : null}

          {/* ── 6 · The read ── */}
          {latest && insight ? (
            <section id="read" data-reveal className={styles.block}>
              <span className={styles.eyebrow} data-voice>Health today</span>
              <div className={styles.headRow} data-dial>
                {/*
                  * The dial, drawn bare. The figure is set at 62px an inch
                  * away, so a ring printing it again would be the same
                  * measurement twice — the arc alone says how far along the
                  * number is. It is the one place on this page that gets a
                  * halo, because it is the one number that is live.
                  */}
                <span className={styles.dial}>
                  <ScoreRing score={latest.score} size={92} bare />
                </span>
                <h2 className={`num ${styles.h2}`}>{latest.score}</h2>
                {delta != null && delta !== 0 ? (
                  <span className={styles.delta}>
                    {delta > 0 ? "+" : "−"}
                    {Math.abs(delta)} this week
                  </span>
                ) : null}
              </div>
              <p className={styles.lede}>{insight.sentence}</p>

              {/*
                * The four readings as figures on one hairline. They were
                * meters here and meters again in the archetype block below —
                * eight saturated bars on one screen, when the figure beside
                * each is what carries the reading.
                */}
              <div className={styles.figures}>
                {(Object.entries(latest.components) as Array<[string, number]>).map(
                  ([name, value]) => (
                    <div key={name} className={styles.figure}>
                      <span className={styles.figLabel}>{name}</span>
                      <span className={`num ${styles.figValue}`}>{value}</span>
                      <span className={styles.figTail}>{COMPARISON[name] ?? ""}</span>
                    </div>
                  ),
                )}
              </div>

              <div className={styles.actions}>
                <span className={styles.written}>Written by Canopy</span>
                <ShareButton type="health" label="your score" size={44} />
              </div>
            </section>
          ) : null}

          {/* ── 7 · What the P&L hides. Absent when nothing clears a floor. ── */}
          {findings.length ? (
            <section id="patterns" data-reveal className={styles.block}>
              <span className={styles.eyebrow}>Patterns</span>
              <h2 className={styles.h2}>What your P&amp;L hides</h2>

              <div className={styles.findings}>
                {[...findings]
                  .sort(
                    (a, b) =>
                      (a.impact ?? Number.POSITIVE_INFINITY) -
                      (b.impact ?? Number.POSITIVE_INFINITY),
                  )
                  .map((f) => (
                    <div key={f.key} className={styles.finding}>
                      <span
                        className={`num ${styles.findFigure}`}
                        data-tone={
                          f.impact == null ? undefined : f.impact >= 0 ? "moss" : "loss"
                        }
                      >
                        {f.impact != null ? signedMoney(f.impact) : "—"}
                      </span>
                      <span className={styles.findText}>
                        <span className={styles.findSentence}>{f.sentence}</span>
                        <span className={styles.findEvidence}>{f.evidence}</span>
                      </span>
                    </div>
                  ))}
              </div>

              <p className={styles.prov}>
                Every figure is realised P&amp;L from your own brokerage — what the
                habit actually returned, never a projection.
              </p>
            </section>
          ) : null}

          {/* ── 8 · How steadily ── */}
          {data.scores.length > 1 ? (
            <section id="consistency" data-reveal className={styles.block}>
              <span className={styles.eyebrow} data-voice>Consistency</span>
              <h2 className={styles.h2}>
                {streak > 0 ? `${streak} days inside your rules` : "Your scored days"}
              </h2>
              <p className={styles.lede}>
                {longest > streak
                  ? `Half a year of readings, one cell a day. Your longest run so far is ${longest} days.`
                  : "Half a year of readings, one cell a day. A pale cell is a day the score came in low; an empty one is a day with nothing to score."}
              </p>

              {/*
                * A density grid is a texture, not a fill: the cells cap at
                * 15px and the row scrolls past the block rather than
                * stretching to it, or a hundred-odd cells at full width
                * become tiles and the whole section reads as one saturated
                * rectangle.
                */}
              <div className={styles.heat}>
                <HeatGrid days={heat} />
              </div>
            </section>
          ) : null}

          {/*
            * ── 9 · The loop ──
            *
            * The only input a brokerage cannot supply, and every correlation
            * on this page is downstream of it. Two taps, no text field: a
            * free-text reason cannot be grouped, and a reason that cannot be
            * grouped cannot become a finding.
            */}
          <section data-reveal className={styles.block}>
            <TagPrompt queue={queue} tagged={data.tagged} total={Math.max(data.taggable, data.tagged)} />
          </section>

          {/* ── 10 · Who the ledger says you are ── */}
          {components ? (
            <section id="identity" data-reveal className={styles.block}>
              <span className={styles.eyebrow} data-voice>Identity</span>
              <div className={styles.archHead}>
                <Avatar archetype={archetype.key} size={64} />
                <div className={styles.archText}>
                  <h2 className={styles.h2}>{archetype.name}</h2>
                  <p className={styles.lede}>{archetype.line}</p>
                  <span className={styles.archStrong}>{strongLine(archetype)}</span>
                </div>
                <ShareButton type="archetype" label="your archetype" size={44} />
              </div>

              {/*
                * The four readings as figures rather than meters. Eight
                * saturated bars was the largest block of colour on the old
                * dashboard, and the number beside each is what carries the
                * reading anyway.
                */}
              <div className={styles.figures}>
                {(Object.entries(components) as Array<[string, number]>).map(([name, value]) => (
                  <div key={name} className={styles.figure}>
                    <span className={styles.figLabel}>{name}</span>
                    <span className={`num ${styles.figValue}`}>{value}</span>
                    <span className={styles.figTail}>{COMPARISON[name] ?? ""}</span>
                  </div>
                ))}
                {data.investorAge != null ? (
                  <div className={styles.figure}>
                    <span className={styles.figLabel}>Investor age</span>
                    <span className={`num ${styles.figValue}`} data-tone="accent">
                      {data.investorAge}
                    </span>
                    <span className={styles.figTail}>How old the conduct reads.</span>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* ── 11 · What you have minted ── */}
          <section id="cards" data-reveal className={styles.block}>
            <span className={styles.eyebrow}>Cards</span>
            <h2 className={styles.h2}>
              {minted.length
                ? `${minted.length} minted`
                : "Nothing minted yet"}
            </h2>
            <p className={styles.lede}>
              {minted.length
                ? "Each one lives at its own link and stays there. Sharing is never behind a plan."
                : "A card is minted the moment you share one. Your year is on the Wrapped screen."}
            </p>

            {minted.length ? (
              <div className={styles.minted}>
                {minted.map((m) => (
                  <TrophyCard
                    key={m.slug}
                    trophy={{
                      slug: m.slug,
                      type: m.type,
                      rarity: m.rarity,
                      year: m.date.slice(0, 4),
                      value: m.value,
                      title: m.label,
                      tail: m.tail,
                      symbol: m.symbol,
                    }}
                  />
                ))}
              </div>
            ) : null}

            <Link href="/wrapped" className={styles.out}>
              Open your Wrapped
              <Arrow />
            </Link>
          </section>

          {/*
            * ── 12 · The formats ──
            *
            * The paid plan's whole surface, and until now it had none: the four
            * capabilities were enforced in API routes that nothing in the app
            * linked to, so Pro was a feature list with no button behind it.
            *
            * Locked rows state the format and nothing else. There is no
            * fabricated preview here — a plausible figure under a blur is the
            * one thing this product must not print.
            */}
          <section data-reveal className={styles.block}>
            <span className={styles.eyebrow}>Formats</span>
            <h2 className={styles.h2}>
              {pro ? "Publish it anywhere" : "Formats for publishing"}
            </h2>
            <p className={styles.lede}>
              {pro
                ? "Every card you have minted, at press size, on any ground, in one archive or one URL."
                : `Sharing a card is free and always will be. Pro adds the export formats — $${TIER_PRICE.pro.monthly} a month.`}
            </p>

            <div className={styles.formats}>
              <div className={styles.format}>
                <span className={styles.formatName}>Your year as a carousel</span>
                <span className={styles.formatBody}>
                  One ZIP, one feed-sized slide per card you earned.
                </span>
                {pro ? (
                  <a className={styles.formatGo} href="/api/cards/carousel">
                    Download the ZIP
                  </a>
                ) : (
                  <span className={styles.formatLock}>Pro</span>
                )}
              </div>

              <div className={styles.format}>
                <span className={styles.formatName}>Publication export</span>
                <span className={styles.formatBody}>
                  {newest
                    ? `Your latest card at 4×, or on a transparent ground.`
                    : "Mint a card and it exports at 4×, or on a transparent ground."}
                </span>
                {pro && newest ? (
                  <span className={styles.formatPair}>
                    <a
                      className={styles.formatGo}
                      href={`/api/cards/export/${newest.slug}?format=feed&scale=4`}
                    >
                      4× PNG
                    </a>
                    <a
                      className={styles.formatGo}
                      href={`/api/cards/export/${newest.slug}?format=feed&scale=4&variant=transparent`}
                    >
                      Transparent
                    </a>
                  </span>
                ) : pro ? (
                  <span className={styles.formatLock} data-quiet="">
                    No card yet
                  </span>
                ) : (
                  <span className={styles.formatLock}>Pro</span>
                )}
              </div>

              <div className={styles.format}>
                <span className={styles.formatName}>Live badge</span>
                <span className={styles.formatBody}>
                  An SVG at its own URL that redraws as the score moves.
                </span>
                {pro ? <BadgeMint /> : <span className={styles.formatLock}>Pro</span>}
              </div>
            </div>

            {pro ? null : (
              <Link href="/pricing" className={styles.out}>
                See what Pro adds
                <Arrow />
              </Link>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Play() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2z" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h13" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

const COMPARISON: Record<string, string> = {
  adherence: "Against your own baseline.",
  consistency: "Sizing and cadence, week over week.",
  patience: "What you do in a drawdown.",
  exposure: "Inside your band.",
};
