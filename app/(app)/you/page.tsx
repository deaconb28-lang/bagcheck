import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { isMarketConfigured, refreshHoldings } from "@/lib/market";
import { EquityCurve, HeatGrid } from "@/components/idioms";
import { Avatar, Logo } from "@/components/primitives";
import { BadgeMint } from "@/components/app/BadgeMint";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { SignInCta } from "@/components/app/SignInCta";
import { strongLine } from "@/lib/archetypes";
import { TIER_PRICE, can } from "@/lib/tiers";
import {
  archetypeOf,
  currentStreak,
  heatFromScores,
  longestStreak,
  money,
  signedMoney,
  weekDelta,
} from "../derive";
import screen from "../screen.module.css";
import styles from "./you.module.css";

export const metadata: Metadata = { title: "You" };
export const dynamic = "force-dynamic";

/**
 * Everything the ledger concluded about you, on one page.
 *
 * It replaces four screens — DNA, Patterns, Insights and Cards — which
 * between them held maybe two pages of real content and a great deal of
 * repetition: the archetype rendered on three of them, the components on two,
 * and a third of the tiles were locked panels showing invented figures.
 *
 * The split was wrong in the first place. `/home` answers "how is it going",
 * `/wrapped` is the artefact, and everything else is one question — *what does
 * my own history say about me* — which does not need four tabs to ask.
 *
 * Nothing here invents anything. The findings section is absent rather than
 * empty when the engine has nothing that clears a sample floor, and the
 * equity curve is absent until there are two snapshots to draw a line between.
 */
export default async function YouPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · you"
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to see your read"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : "Holdings, archetype and the patterns your own history is hiding."
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
          eyebrow="Bagcheck · you"
          icon={data.connection ? "waiting" : "connect"}
          title={data.connection ? "Nothing read yet" : "Connect a brokerage"}
          body={
            data.connection
              ? "Run a sync and your positions, archetype and patterns fill in together."
              : "One tap via SnapTrade, read-only. Positions and history arrive together."
          }
          actions={[{ label: "Connect a brokerage", href: "/start" }]}
        />
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

  const { cards } = await getCollections();
  const minted = await cards
    .find({ userId })
    .sort({ mintedAt: -1 })
    .limit(8)
    .project<{ type: string; slug: string; title: string | null }>({
      _id: 0,
      type: 1,
      slug: 1,
      title: 1,
    })
    .toArray();

  /*
   * One capability stands for the plan here: the five move together, so a
   * screen asking about five of them five times would be asking one question
   * badly. The routes still check their own.
   */
  const pro = can({ tier: data.tier }, "publicationExport");
  const newest = minted[0] ?? null;

  return (
    <>
      <ScreenHeader
        title="You"
        meta={`${holdings.length} positions · ${data.scores.length} scored days · ${data.transactionCount.toLocaleString("en-US")} transactions`}
        score={latest?.score ?? null}
        delta={weekDelta(data.scores)}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        tier={data.tier}
      />

      <div className={screen.body}>
        <div className={`${screen.grid} ${styles.wide}`}>
          {/* ── 1 · What you are worth ── */}
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

          {/* ── 2 · What you are holding ── */}
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

          {/* ── 3 · Who the ledger says you are ── */}
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

          {/* ── 4 · How steadily. ── */}
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

          {/* ── 5 · What the P&L hides. Absent when nothing clears a floor. ── */}
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

          {/* ── 5 · What you have minted ── */}
          <section data-reveal className={styles.block} style={{ animationDelay: "0.1s" }}>
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
                  <a key={m.slug} className={styles.mintedRow} href={`/c/${m.slug}`}>
                    <span className={styles.mintedName}>{m.title ?? m.type}</span>
                    <span className={styles.mintedSlug}>/c/{m.slug.slice(0, 8)}…</span>
                  </a>
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
            * ── 6 · The formats ──
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
