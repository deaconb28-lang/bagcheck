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
  taggedOpensFor,
} from "@/lib/db";
import type { CardDoc } from "@/lib/db";
import { isMarketConfigured, refreshHoldings } from "@/lib/market";
import { untaggedQueue } from "@/lib/tags";
import type { UntaggedEntry } from "@/lib/tags";
import { assembleWrappedFrom } from "@/lib/wrapped/assemble";
import { storedPhotos } from "@/lib/unsplash";
import { EquityCurve, HeatGrid, ScoreRing, ZeroBarChart } from "@/components/idioms";
import type { WaveDay } from "@/components/idioms";
import { TrophyCard } from "@/components/cards/TrophyCard";
import { Avatar, Logo } from "@/components/primitives";
import { BadgeMint } from "@/components/app/BadgeMint";
import { EmptyState } from "@/components/app/EmptyState";
import { FirstScore } from "@/components/app/FirstScore";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
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

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * The dashboard. One screen, and the only one.
 *
 * It began as the merge of four — DNA, Patterns, Insights and Cards — which
 * between them held maybe two pages of real content and a great deal of
 * repetition. It has now absorbed Home as well, because the split that
 * survived that merge was still a split: `/home` answered "how is it going"
 * and `/you` answered "what does my history say about me", and a reader who
 * opens a portfolio app is asking one question with two halves. Two dashboards
 * meant the money lived on one screen and everything that explains the money
 * lived on another, with a quiet link between them that most people never
 * followed.
 *
 * The order is the order a reader asks in. What did I make, what am I holding,
 * how am I behaving, what does the year look like, who does that make me, and
 * what have I got to show for it. Money first, because that is the first
 * question; the artefact fourth, because an artefact is what you reach for
 * once you know where you stand.
 *
 * `/wrapped` is the subpage this opens into rather than a rail destination —
 * the deck block is the door, and reading a card is still its job.
 *
 * Nothing here invents anything. The findings section is absent rather than
 * empty when the engine has nothing that clears a sample floor, and the
 * equity curve is absent until there are two snapshots to draw a line between.
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
          eyebrow="Bagcheck"
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
          eyebrow="Bagcheck"
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
   * Everything Home used to load, off the screen this page already holds.
   *
   * `assembleWrapped` would re-read the same 400 scores for the same document;
   * `assembleWrappedFrom` takes the one in hand and the tag opens it needs for
   * conviction, which is the only read the deck adds. Merging the two screens
   * merged their queries too — the pair used to load the same ledger twice, on
   * two navigations, to answer two halves of one question.
   */
  const { transactions, tags } = await getCollections();
  const [recent, taggedDocs, insight, opens, photos] = await Promise.all([
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
    taggedOpensFor(userId),
    storedPhotos(),
  ]);

  const wrapped = assembleWrappedFrom(data, opens);

  /*
   * The wave is read, not computed. This used to pull four thousand rows on
   * every navigation; the derived document holds the same series, rebuilt only
   * when the ledger actually moves.
   */
  const wave: WaveDay[] = (data.derived?.dailyPnl ?? [])
    .slice(-63)
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
        meta={`${holdings.length} positions · ${data.scores.length} scored days · ${data.transactionCount.toLocaleString("en-US")} transactions`}
        /*
          * Null, like Home's used to be. The read block sets the score at
          * 62px with its own dial a third of the way down this page; a third
          * copy of the same number in the chrome above it is noise.
          */
        score={null}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        tier={data.tier}
      />

      <div className={screen.body}>
        <div className={`${screen.grid} ${styles.wide}`}>
          {/* ── 1 · The money ── */}
          {wave.length > 1 ? (
            <section id="money" data-reveal className={styles.block}>
              <span className={styles.eyebrow}>Realised P&amp;L</span>
              <div className={styles.headRow}>
                <h2
                  className={`num ${styles.h2}`}
                  data-tone={summary.total >= 0 ? "moss" : "loss"}
                >
                  {signedMoney(summary.total)}
                </h2>
                <ShareButton type="monthlyPnl" label="this chart" size={44} />
              </div>
              <p className={styles.lede}>
                Across {wave.length} sessions — {summary.green} green, {summary.red}{" "}
                red. Best {signedMoney(summary.best)}, worst {signedMoney(summary.worst)}.
              </p>

              <div className={styles.chart}>
                <ZeroBarChart days={wave} />
              </div>
            </section>
          ) : null}

          {/* ── 2 · What you are worth ── */}
          <section data-reveal className={styles.block}>
            <span className={styles.eyebrow}>Portfolio</span>
            <h2 className={styles.h2}>{money(totalValue)}</h2>
            <p className={styles.lede}>
              {winners} of {holdings.length} positions in profit, against a cost
              basis of {money(totalCost)}.
            </p>

            <div className={styles.figures}>
              <div className={styles.figure}>
                <span className={styles.figLabel}>Return on cost</span>
                <span
                  className={`num ${styles.figValue}`}
                  data-tone={returnPct == null ? undefined : returnPct >= 0 ? "moss" : "loss"}
                >
                  {returnPct == null
                    ? "—"
                    : `${returnPct >= 0 ? "+" : "−"}${Math.abs(returnPct).toFixed(1)}%`}
                </span>
                <span className={styles.figTail}>Unrealised, on the current mark.</span>
              </div>
              <div className={styles.figure}>
                <span className={styles.figLabel}>Accounts</span>
                <span className={`num ${styles.figValue}`}>
                  {data.connection?.accounts.length ?? 0}
                </span>
                <span className={styles.figTail}>
                  {data.connection?.accounts.map((a) => a.institution).filter(Boolean).slice(0, 2).join(", ") || "Linked read-only."}
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

          {/* ── 3 · The read ── */}
          {latest && insight ? (
            <section id="read" data-reveal className={styles.block} style={{ animationDelay: "0.03s" }}>
              <span className={styles.eyebrow}>Health today</span>
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
                <span className={styles.written}>Written by Bagcheck</span>
                <ShareButton type="health" label="your score" size={44} />
              </div>
            </section>
          ) : null}

          {/* ── 4 · The year, and the door into it ── */}
          {wrapped ? (
            <YearBlock year={wrapped.label} cards={wrapped.cards} photos={photos} />
          ) : null}

          {/* ── 5 · What you are holding ── */}
          <section data-reveal className={styles.block} style={{ animationDelay: "0.04s" }}>
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

          {/* ── 6 · Who the ledger says you are ── */}
          {components ? (
            <section data-reveal className={styles.block} style={{ animationDelay: "0.06s" }}>
              <span className={styles.eyebrow}>Identity</span>
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

          {/* ── 7 · How steadily ── */}
          {data.scores.length > 1 ? (
            <section id="consistency" data-reveal className={styles.block} style={{ animationDelay: "0.07s" }}>
              <span className={styles.eyebrow}>Consistency</span>
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

          {/* ── 8 · What the P&L hides. Absent when nothing clears a floor. ── */}
          {findings.length ? (
            <section data-reveal className={styles.block} style={{ animationDelay: "0.08s" }}>
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

          {/*
            * ── 9 · The loop ──
            *
            * The only input a brokerage cannot supply, and every correlation
            * on this page is downstream of it. Two taps, no text field: a
            * free-text reason cannot be grouped, and a reason that cannot be
            * grouped cannot become a finding.
            */}
          <section data-reveal className={styles.block} style={{ animationDelay: "0.09s" }}>
            <TagPrompt queue={queue} tagged={data.tagged} total={Math.max(data.taggable, data.tagged)} />
          </section>

          {/* ── 10 · What you have minted ── */}
          <section id="cards" data-reveal className={styles.block} style={{ animationDelay: "0.1s" }}>
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
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h13" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
          </section>

          {/*
            * ── 11 · The formats ──
            *
            * The paid plan's whole surface, and until now it had none: the four
            * capabilities were enforced in API routes that nothing in the app
            * linked to, so Pro was a feature list with no button behind it.
            *
            * Locked rows state the format and nothing else. There is no
            * fabricated preview here — a plausible figure under a blur is the
            * one thing this product must not print.
            */}
          <section data-reveal className={styles.block} style={{ animationDelay: "0.12s" }}>
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
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h13" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

const COMPARISON: Record<string, string> = {
  adherence: "Against your own baseline.",
  consistency: "Sizing and cadence, week over week.",
  patience: "What you do in a drawdown.",
  exposure: "Inside your band.",
};
