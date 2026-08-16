import Link from "next/link";
import type { CardDoc, ConnectionAccount, HoldingRow, ScoreDoc } from "@/lib/db";
import type { RaceField } from "@/lib/returns";
import type { Archetype } from "@/lib/archetypes";
import { strongLine } from "@/lib/archetypes";
import { TIER_PRICE } from "@/lib/tiers";
import { fieldProvenance } from "@/lib/market";
import {
  AllocationRing,
  CountUp,
  EquityCurve,
  HeatGrid,
  RaceBars,
  ScoreRing,
  ZeroBarChart,
} from "@/components/idioms";
import type { HeatDay, WaveDay } from "@/components/idioms";
import { TrophyCard } from "@/components/cards/TrophyCard";
import { Avatar, Logo } from "@/components/primitives";
import { BadgeMint } from "@/components/app/BadgeMint";
import { ShareButton } from "@/components/app/ShareButton";
import { money, signedMoney } from "../derive";
import {
  accountsClause,
  moneyTone,
  ordinal,
  realisedIn,
  sessionsLede,
  signedPct,
  windowLabel,
} from "./model";
import type { BookSummary, SessionSummary, YearWindow } from "./model";
import { ComponentFigures, Figure, OutLink, Play } from "./parts";
import styles from "./you.module.css";

/**
 * The dashboard's blocks, one component each.
 *
 * They were twelve `<section>` elements inside a single six-hundred-line
 * function, which meant reading any one of them required scrolling past the
 * other eleven and the whole page's arithmetic. Each takes only what it prints
 * — that narrowness is the point, because a block that cannot reach the rest
 * of the screen cannot quietly start depending on it.
 *
 * Every one is a server component. Nothing here fetches; the page hands each
 * block finished values.
 */

/* ── 1 · What the sessions did ────────────────────────────────────────────── */

export function MoneyBlock({
  sessions,
  summary,
}: {
  sessions: WaveDay[];
  summary: SessionSummary;
}) {
  return (
    <section id="money" data-reveal className={styles.block}>
      <span className={styles.eyebrow}>Realised P&amp;L</span>
      <div className={styles.headRow}>
        <h2 className={`num ${styles.h2}`} data-tone={moneyTone(summary.total)}>
          {sessions.length ? <CountUp value={summary.total} kind="signedMoney" /> : "—"}
        </h2>
        {sessions.length ? <ShareButton type="monthlyPnl" label="this chart" size={44} /> : null}
      </div>
      <p className={styles.lede}>{sessionsLede(sessions, summary, signedMoney)}</p>

      {sessions.length > 1 ? (
        <div className={styles.chart}>
          <ZeroBarChart days={sessions} height={200} />
        </div>
      ) : null}
    </section>
  );
}

/* ── 2 · Where the money is ───────────────────────────────────────────────── */

export function AllocationBlock({
  holdings,
  book,
}: {
  holdings: HoldingRow[];
  book: BookSummary;
}) {
  return (
    <section id="exposure" data-reveal className={styles.block}>
      <span className={styles.eyebrow}>Allocation</span>
      <div className={styles.headRow}>
        <h2 className={`num ${styles.h2}`}>
          <CountUp value={book.totalValue} kind="money" />
        </h2>
      </div>
      <p className={styles.lede}>
        {book.positions
          ? `Where the book sits today, by market value. ${book.largest ?? "Your largest name"} is the largest name in it.`
          : "Nothing is held right now."}
      </p>

      {/*
        * The ring declines to draw under three names — a two-slice donut is a
        * sentence — so the gap it would sit in is not opened either. This once
        * asked for `holdings.length` and left 44px of nothing under a lede
        * promising a chart.
        */}
      {book.positions >= 3 ? (
        <div className={styles.chart}>
          <AllocationRing
            slices={holdings.map((h) => ({ key: h.symbol, label: h.symbol, value: h.value ?? 0 }))}
          />
        </div>
      ) : null}
    </section>
  );
}

/* ── 3 · Where you stand ──────────────────────────────────────────────────── */

export function StandingBlock({
  book,
  accounts,
  ytd,
  window,
  realised,
  scoredDays,
  curve,
  provenance,
  year,
}: {
  book: BookSummary;
  accounts: ConnectionAccount[] | undefined;
  /** The reader's own return over `window`, as a fraction. */
  ytd: number | null;
  window: YearWindow;
  realised: ReturnType<typeof realisedIn>;
  scoredDays: number;
  curve: Array<{ date: string; value: number }>;
  provenance: string;
  year: number;
}) {
  return (
    <section id="standing" data-reveal className={styles.block}>
      <span className={styles.eyebrow}>Standing</span>
      <h2 className={styles.h2}>
        {book.returnPct == null ? "Your book" : `${book.winners} of ${book.positions} in profit`}
      </h2>
      <p className={styles.lede}>
        Against a cost basis of {money(book.totalCost)}
        {accountsClause(accounts)}.
      </p>

      <div className={styles.figures}>
        {/*
          * The label states the window it actually measured. An account that
          * opened in June has a perfectly good return — what it does not have
          * is a year to date, and calling a six-week figure by that name is
          * the kind of wrong nobody would ever catch.
          */}
        <Figure
          label={windowLabel(window)}
          tone={moneyTone(ytd)}
          tail={
            ytd == null
              ? "Needs two marks inside the year."
              : "On the book, with buys and sells taken out."
          }
        >
          {ytd == null ? "—" : <CountUp value={ytd * 100} kind="pct" />}
        </Figure>

        <Figure
          label="Return on cost"
          tone={moneyTone(book.returnPct)}
          tail="Unrealised, on the current mark."
        >
          {book.returnPct == null ? "—" : <CountUp value={book.returnPct} kind="pct" />}
        </Figure>

        <Figure
          label={`Realised in ${year}`}
          tone={moneyTone(realised.amount)}
          tail={
            realised.trips
              ? `Across ${realised.trips} closed round ${realised.trips === 1 ? "trip" : "trips"}, FIFO matched.`
              : "Nothing has closed this year."
          }
        >
          <CountUp value={realised.amount} kind="signedMoney" />
        </Figure>

        <Figure label="Scored days" tail="One reading a day, off your own fills.">
          {scoredDays}
        </Figure>
      </div>

      {curve.length > 1 ? (
        <div className={styles.curve}>
          <EquityCurve series={curve} />
        </div>
      ) : null}
      <p className={styles.prov}>{provenance}</p>
    </section>
  );
}

/* ── 4 · The field ────────────────────────────────────────────────────────── */

/**
 * The one surface in Canopy that measures the reader against anything other
 * than themselves, which is why it is `--signal` and why every row is a fund
 * with a ticker rather than "hedge funds" in the aggregate. There is no
 * hedge-fund index in this repository and no key for one; what there is are
 * four funds that exist to replicate hedge-fund strategies and publish a price
 * every day, quoted through the same provider as every other mark on the
 * screen. A bar labelled with a number nobody can check is the one thing this
 * screen must not draw.
 *
 * The caller renders it only when the field placed the reader in it — absent,
 * not empty and not estimated, without a market key, without two quotable
 * funds, or without a year the reader's own curve can answer for.
 */
export function FieldBlock({
  field,
  place,
  ytd,
  asOf,
}: {
  field: RaceField;
  place: number;
  ytd: number;
  asOf: string;
}) {
  const above = field.rows[place - 2]?.label ?? "The row above";
  return (
    <section id="race" data-reveal className={styles.block}>
      <span className={styles.eyebrow}>Year to date · the field</span>
      <div className={styles.headRow}>
        <h2 className={`num ${styles.h2}`} data-tone={moneyTone(ytd)}>
          <CountUp value={ytd * 100} kind="pct" />
        </h2>
        <span className={styles.place}>
          {ordinal(place)} of {field.of}
        </span>
      </div>
      {/*
        * Descriptive, and no race verbs. The rows are ordered because that is
        * what makes a set of returns readable at a glance; the sentence states
        * a difference between two figures and stops, because the moment it
        * says beat or lead or lag the screen has started rating somebody.
        */}
      <p className={styles.lede}>
        Your year beside four funds built to replicate hedge-fund strategies,
        and the S&amp;P 500.{" "}
        {field.behind == null
          ? "Nothing in the field returned more this year."
          : `${above} returned ${(field.behind * 100).toFixed(1)} points more.`}
      </p>

      <RaceBars field={field} />

      {/*
        * Today, not the sync date. These returns come from the market provider
        * on a six-hour cache and are current whatever the brokerage last said —
        * stamping them with the last sync would date today's bars to a
        * reader's June.
        */}
      <p className={styles.prov}>{fieldProvenance(field.of - 1, asOf)}</p>
    </section>
  );
}

/* ── 5 · The book, name by name ───────────────────────────────────────────── */

export function HoldingsBlock({
  holdings,
  totalValue,
}: {
  holdings: HoldingRow[];
  totalValue: number;
}) {
  return (
    <section id="holdings" data-reveal className={styles.block}>
      <span className={styles.eyebrow}>Holdings</span>
      <h2 className={styles.h2}>What you are holding</h2>

      <div className={styles.holdings}>
        {holdings.map((holding) => (
          <HoldingRowItem key={holding.symbol} holding={holding} totalValue={totalValue} />
        ))}
      </div>
    </section>
  );
}

function HoldingRowItem({
  holding,
  totalValue,
}: {
  holding: HoldingRow;
  totalValue: number;
}) {
  const weight = totalValue ? ((holding.value ?? 0) / totalValue) * 100 : 0;
  return (
    <div className={styles.holding}>
      <Logo symbol={holding.symbol} size={30} />
      <div className={styles.holdingName}>
        <span className={styles.symbol}>{holding.symbol}</span>
        {holding.description ? <span className={styles.desc}>{holding.description}</span> : null}
      </div>
      {/* Weight is neither discipline nor exposure — it is size. */}
      <div className={styles.weight}>
        <i style={{ width: `${weight.toFixed(1)}%` }} />
      </div>
      <span className={`num ${styles.units}`}>
        {holding.units.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </span>
      <span className={`num ${styles.value}`}>{money(holding.value)}</span>
      <span className={`num ${styles.ret}`} data-tone={moneyTone(holding.pnlPct)}>
        {holding.pnlPct == null ? "—" : signedPct(holding.pnlPct)}
      </span>
    </div>
  );
}

/* ── 6 · The read ─────────────────────────────────────────────────────────── */

export function ReadBlock({
  score,
  sentence,
  delta,
}: {
  score: ScoreDoc;
  sentence: string;
  /** Signed weekly change. Absent at zero, because zero is not a direction. */
  delta: number | null;
}) {
  return (
    <section id="read" data-reveal className={styles.block}>
      <span className={styles.eyebrow} data-voice>Health today</span>
      <div className={styles.headRow} data-dial>
        {/*
          * The dial, drawn bare. The figure is set at 62px an inch away, so a
          * ring printing it again would be the same measurement twice — the
          * arc alone says how far along the number is. It is the one place on
          * this page that gets a halo, because it is the one number that is
          * live.
          */}
        <span className={styles.dial}>
          <ScoreRing score={score.score} size={92} bare />
        </span>
        <h2 className={`num ${styles.h2}`}>{score.score}</h2>
        {delta != null && delta !== 0 ? (
          <span className={styles.delta}>
            {delta > 0 ? "+" : "−"}
            {Math.abs(delta)} this week
          </span>
        ) : null}
      </div>
      <p className={styles.lede}>{sentence}</p>

      <div className={styles.figures}>
        <ComponentFigures components={score.components as unknown as Record<string, number>} />
      </div>

      <div className={styles.actions}>
        <span className={styles.written}>Written by Canopy</span>
        <ShareButton type="health" label="your score" size={44} />
      </div>
    </section>
  );
}

/* ── 7 · What the P&L hides ───────────────────────────────────────────────── */

type Finding = { key: string; sentence: string; evidence: string; impact: number | null };

/** Worst first: the point of the block is the money the habit cost. */
const byImpact = (a: Finding, b: Finding) =>
  (a.impact ?? Number.POSITIVE_INFINITY) - (b.impact ?? Number.POSITIVE_INFINITY);

export function PatternsBlock({ findings }: { findings: Finding[] }) {
  return (
    <section id="patterns" data-reveal className={styles.block}>
      <span className={styles.eyebrow}>Patterns</span>
      <h2 className={styles.h2}>What your P&amp;L hides</h2>

      <div className={styles.findings}>
        {[...findings].sort(byImpact).map((finding) => (
          <div key={finding.key} className={styles.finding}>
            <span className={`num ${styles.findFigure}`} data-tone={moneyTone(finding.impact)}>
              {finding.impact != null ? signedMoney(finding.impact) : "—"}
            </span>
            <span className={styles.findText}>
              <span className={styles.findSentence}>{finding.sentence}</span>
              <span className={styles.findEvidence}>{finding.evidence}</span>
            </span>
          </div>
        ))}
      </div>

      <p className={styles.prov}>
        Every figure is realised P&amp;L from your own brokerage — what the habit
        actually returned, never a projection.
      </p>
    </section>
  );
}

/* ── 8 · How steadily ─────────────────────────────────────────────────────── */

export function ConsistencyBlock({
  days,
  streak,
  longest,
}: {
  days: HeatDay[];
  streak: number;
  longest: number;
}) {
  return (
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
        * A density grid is a texture, not a fill: the cells cap at 15px and
        * the row scrolls past the block rather than stretching to it, or a
        * hundred-odd cells at full width become tiles and the whole section
        * reads as one saturated rectangle.
        */}
      <div className={styles.heat}>
        <HeatGrid days={days} />
      </div>
    </section>
  );
}

/* ── 10 · Who the ledger says you are ─────────────────────────────────────── */

export function IdentityBlock({
  archetype,
  components,
  investorAge,
}: {
  archetype: Archetype;
  components: Record<string, number>;
  investorAge: number | null;
}) {
  return (
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

      <div className={styles.figures}>
        <ComponentFigures components={components} />
        {investorAge != null ? (
          <Figure label="Investor age" tone="accent" tail="How old the conduct reads.">
            {investorAge}
          </Figure>
        ) : null}
      </div>
    </section>
  );
}

/* ── 11 · What you have minted ────────────────────────────────────────────── */

type MintedCard = Pick<
  CardDoc,
  "type" | "slug" | "label" | "value" | "tail" | "rarity" | "symbol" | "date"
>;

export function MintedBlock({ minted }: { minted: MintedCard[] }) {
  return (
    <section id="cards" data-reveal className={styles.block}>
      <span className={styles.eyebrow}>Cards</span>
      <h2 className={styles.h2}>
        {minted.length ? `${minted.length} minted` : "Nothing minted yet"}
      </h2>
      <p className={styles.lede}>
        {minted.length
          ? "Each one lives at its own link and stays there. Sharing is never behind a plan."
          : "A card is minted the moment you share one. Your year is on the Wrapped screen."}
      </p>

      {minted.length ? (
        <div className={styles.minted}>
          {minted.map((card) => (
            <TrophyCard
              key={card.slug}
              trophy={{
                slug: card.slug,
                type: card.type,
                rarity: card.rarity,
                year: card.date.slice(0, 4),
                value: card.value,
                title: card.label,
                tail: card.tail,
                symbol: card.symbol,
              }}
            />
          ))}
        </div>
      ) : null}

      <OutLink href="/wrapped">Open your Wrapped</OutLink>
    </section>
  );
}

/* ── 12 · The formats ─────────────────────────────────────────────────────── */

/**
 * The paid plan's whole surface, and until recently it had none: the four
 * capabilities were enforced in API routes that nothing in the app linked to,
 * so Pro was a feature list with no button behind it.
 *
 * Locked rows state the format and nothing else. There is no fabricated
 * preview — a plausible figure under a blur is the one thing this product must
 * not print.
 */
export function FormatsBlock({ pro, newest }: { pro: boolean; newest: MintedCard | null }) {
  const exportUrl = (variant?: string) =>
    `/api/cards/export/${newest?.slug}?format=feed&scale=4${variant ? `&variant=${variant}` : ""}`;

  return (
    <section data-reveal className={styles.block}>
      <span className={styles.eyebrow}>Formats</span>
      <h2 className={styles.h2}>{pro ? "Publish it anywhere" : "Formats for publishing"}</h2>
      <p className={styles.lede}>
        {pro
          ? "Every card you have minted, at press size, on any ground, in one archive or one URL."
          : `Sharing a card is free and always will be. Pro adds the export formats — $${TIER_PRICE.pro.monthly} a month.`}
      </p>

      <div className={styles.formats}>
        <FormatRow name="Your year as a carousel" body="One ZIP, one feed-sized slide per card you earned.">
          {pro ? (
            <a className={styles.formatGo} href="/api/cards/carousel">
              Download the ZIP
            </a>
          ) : (
            <Lock />
          )}
        </FormatRow>

        <FormatRow
          name="Publication export"
          body={
            newest
              ? "Your latest card at 4×, or on a transparent ground."
              : "Mint a card and it exports at 4×, or on a transparent ground."
          }
        >
          {pro && newest ? (
            <span className={styles.formatPair}>
              <a className={styles.formatGo} href={exportUrl()}>
                4× PNG
              </a>
              <a className={styles.formatGo} href={exportUrl("transparent")}>
                Transparent
              </a>
            </span>
          ) : pro ? (
            <span className={styles.formatLock} data-quiet="">
              No card yet
            </span>
          ) : (
            <Lock />
          )}
        </FormatRow>

        <FormatRow name="Live badge" body="An SVG at its own URL that redraws as the score moves.">
          {pro ? <BadgeMint /> : <Lock />}
        </FormatRow>
      </div>

      {pro ? null : <OutLink href="/pricing">See what Pro adds</OutLink>}
    </section>
  );
}

function FormatRow({
  name,
  body,
  children,
}: {
  name: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.format}>
      <span className={styles.formatName}>{name}</span>
      <span className={styles.formatBody}>{body}</span>
      {children}
    </div>
  );
}

/** The plan name is a word, in the reserved violet, and never a fill. */
function Lock() {
  return <span className={styles.formatLock}>Pro</span>;
}

/* ── The door, above everything ───────────────────────────────────────────── */

/**
 * Wrapped was reachable from one block two thirds of the way down the page. It
 * is the most shareable surface in the product and the thing the landing
 * actually sells, so it gets a door before the reader has scrolled anywhere.
 */
export function WrappedDoor({ today, year }: { today: string; year: number }) {
  return (
    <div className={styles.topBar}>
      <span className={styles.asOf}>
        {today} · {year} year to date
      </span>
      <Link href="/wrapped" className={styles.toWrapped}>
        <Play />
        Go to your Wrapped
      </Link>
    </div>
  );
}
