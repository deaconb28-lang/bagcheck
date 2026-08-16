import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import {
  factsFrom,
  getCollections,
  getDailyInsight,
  isDbConfigured,
  loadScreen,
  syncClock,
} from "@/lib/db";
import type { CardDoc, ScreenData } from "@/lib/db";
import { isMarketConfigured, peerReturnsYtd, refreshHoldings } from "@/lib/market";
import { investmentFlows, raceField, ytdReturn } from "@/lib/returns";
import { untaggedQueue } from "@/lib/tags";
import type { UntaggedEntry } from "@/lib/tags";
import { wrappedDeck } from "@/lib/wrapped/year";
import type { WaveDay } from "@/components/idioms";
import { EmptyState } from "@/components/app/EmptyState";
import { FirstScore } from "@/components/app/FirstScore";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { shellUser } from "@/components/app/shellUser";
import { SignInCta } from "@/components/app/SignInCta";
import { SyncDialog } from "@/components/app/SyncDialog";
import { TagPrompt } from "@/components/app/TagPrompt";
import { can, trialLine, trialState } from "@/lib/tiers";
import {
  archetypeOf,
  currentStreak,
  heatFromScores,
  longestStreak,
  waveSummary,
  weekDelta,
} from "../derive";
import {
  AllocationBlock,
  ConsistencyBlock,
  FieldBlock,
  FormatsBlock,
  HoldingsBlock,
  IdentityBlock,
  MintedBlock,
  MoneyBlock,
  PatternsBlock,
  ReadBlock,
  StandingBlock,
  WrappedDoor,
} from "./blocks";
import { greeting, realisedIn, summariseBook, yearWindow } from "./model";
import { YearBlock } from "./YearBlock";
import screen from "../screen.module.css";
import styles from "./you.module.css";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/** How many days of scores the grid and the streaks read. */
const SCORE_WINDOW = 400;
/** Sessions in the P&L chart — a month you can count, not a texture. */
const SESSIONS_SHOWN = 30;

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
 * make me. `/wrapped` is a subpage this opens into — from the door at the top
 * and from the year block itself — rather than a destination anybody has to
 * find on a rail.
 *
 * This function does three things and no more: it decides which of the three
 * screens the reader gets, it loads, and it composes. The arithmetic is in
 * `model.ts` and every block is its own component in `blocks.tsx`, because
 * twelve sections and a spreadsheet in one function meant reading any one of
 * them required scrolling past the other eleven.
 *
 * Nothing here invents anything. The findings block is absent rather than
 * empty when the engine has nothing that clears a sample floor; the equity
 * curve is absent until there are two snapshots to draw a line between; and
 * the field is absent unless the provider quotes at least two real funds and
 * the reader's own curve can answer for a matching window.
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

  if (!userId || !isDbConfigured()) return <NoWayIn signedIn={Boolean(userId)} />;

  const data = await loadScreen(userId, SCORE_WINDOW);
  const latest = data.scores[0] ?? null;

  if (!latest && !data.holdings.length) {
    return <NothingRead data={data}>{syncDialog}</NothingRead>;
  }

  const view = await loadDashboard(userId, data);

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
          <WrappedDoor today={view.today} year={view.year} />

          {/*
            * Two blocks, paired — not one block with two idioms in it. Each
            * keeps its own eyebrow, figure, sentence and single idiom, which
            * is the rule; `.pair` only decides that they sit next to each
            * other on a wide screen and stack on a narrow one.
            */}
          <div className={styles.pair}>
            <MoneyBlock sessions={view.sessions} summary={view.sessionSummary} />
            <AllocationBlock holdings={view.holdings} book={view.book} />
          </div>

          <StandingBlock
            book={view.book}
            accounts={data.connection?.accounts}
            ytd={view.ytd}
            window={view.window}
            realised={view.realised}
            scoredDays={data.scores.length}
            curve={view.curve}
            provenance={view.provenance}
            year={view.year}
          />

          {view.field && view.field.place != null ? (
            <FieldBlock
              field={view.field}
              place={view.field.place}
              ytd={view.ytd ?? 0}
              asOf={view.today}
            />
          ) : null}

          <HoldingsBlock holdings={view.holdings} totalValue={view.book.totalValue} />

          {view.wrapped ? (
            <YearBlock year={String(view.year)} cards={view.wrapped.cards} />
          ) : null}

          {latest && view.insight ? (
            <ReadBlock
              score={latest}
              sentence={view.insight.sentence}
              delta={weekDelta(data.scores)}
            />
          ) : null}

          {view.findings.length ? <PatternsBlock findings={view.findings} /> : null}

          {data.scores.length > 1 ? (
            <ConsistencyBlock
              days={heatFromScores(data.scores)}
              streak={currentStreak(data.scores)}
              longest={longestStreak(data.scores)}
            />
          ) : null}

          {/*
            * The only input a brokerage cannot supply, and every correlation
            * on this page is downstream of it. Two taps, no text field: a
            * free-text reason cannot be grouped, and a reason that cannot be
            * grouped cannot become a finding.
            */}
          <section data-reveal className={styles.block}>
            <TagPrompt
              queue={view.queue}
              tagged={data.tagged}
              total={Math.max(data.taggable, data.tagged)}
            />
          </section>

          {view.components ? (
            <IdentityBlock
              archetype={archetypeOf(view.components)}
              components={view.components}
              investorAge={data.investorAge}
            />
          ) : null}

          <MintedBlock minted={view.minted} />
          <FormatsBlock pro={view.pro} newest={view.minted[0] ?? null} />
        </div>
      </div>
    </>
  );
}

/* ── Loading ──────────────────────────────────────────────────────────────── */

type MintedCard = Pick<
  CardDoc,
  "type" | "slug" | "label" | "value" | "tail" | "rarity" | "symbol" | "date"
>;

/**
 * Everything the screen still has to ask for, in one round.
 *
 * It used to be three: the minted cards, then a batch of four, then the year —
 * three sequential waits on a page that could have taken one, because nothing
 * in the second or third depended on anything in the first. They are one
 * `Promise.all` now.
 *
 * `flowRows` is the narrowest of them: this year's buys and sells, projected
 * to three fields, so the year-to-date figure can take them back out again. A
 * return quoted next to a fund's return has to be a return — buying lifts the
 * equity curve exactly like a gain, and without this query the reader would
 * out-run the whole field by adding to a position.
 *
 * The year block reads the Wrapped pipeline's own cache, so opening the
 * dashboard costs no model call once a year has been built, and the deck it
 * shows is character-identical to the one `/wrapped` plays.
 */
async function loadDashboard(userId: string, data: ScreenData) {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getUTCFullYear();
  const latest = data.scores[0] ?? null;

  const snapshotDate = data.snapshots.reduce<string | null>(
    (newest, snapshot) => (!newest || snapshot.date > newest ? snapshot.date : newest),
    null,
  );

  const { rows: holdings, provenance } = isMarketConfigured()
    ? await refreshHoldings(data.holdings, snapshotDate, today)
    : { rows: data.holdings, provenance: `Brokerage synced ${snapshotDate ?? "never"}` };

  const { cards, transactions, tags } = await getCollections();
  const [minted, recent, taggedDocs, flowRows, insight, peers, wrapped] = await Promise.all([
    /*
     * The minted cards, with what they actually say on them. This once
     * projected `title`, which is not a field on a card document — the label
     * is `label` — so every row fell through to the kind slug and the block
     * rendered a list of internal names beside truncated URLs.
     */
    cards
      .find({ userId })
      .sort({ mintedAt: -1 })
      .limit(8)
      .project<MintedCard>({
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
      .toArray(),
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
      .find({ userId, date: { $gte: `${year}-01-01` }, type: { $regex: /buy|sell/i } })
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
    wrappedDeck(userId, year),
  ]);

  /*
   * The materialised series, not a scan.
   *
   * This once rebuilt the curve from `data.snapshots`, which `loadAppData`
   * caps at the twenty most recent — so on an account with fourteen months of
   * history the "equity curve" silently drew nineteen days and labelled its
   * own axis with them. Screens read derived; that is the rule, and this is
   * what it is for. `interpolated` is carried through because the return
   * arithmetic needs it: a forward-filled opening mark cannot contain a trade
   * dated that day and a real snapshot already does, and the two have to be
   * told apart or the second of January reports every purchase as a gain.
   */
  const curve = (data.derived?.equitySeries ?? []).map((point) => ({
    date: point.date,
    value: point.value,
    interpolated: point.interpolated,
  }));

  const window = yearWindow(curve, year);
  const ytd = ytdReturn(curve, investmentFlows(flowRows), year);

  /* The sessions are read, not computed — materialised once per sync. */
  const sessions: WaveDay[] = (data.derived?.dailyPnl ?? [])
    .slice(-SESSIONS_SHOWN)
    .map((day) => ({ date: day.date, amount: day.realised }));

  return {
    today,
    year,
    holdings,
    provenance,
    book: summariseBook(holdings),
    curve,
    window,
    ytd,
    /* The field only compares windows that match. See `yearWindow`. */
    field: window.sameWindow ? raceField(ytd, peers) : null,
    realised: realisedIn(data.derived?.roundTrips ?? [], year),
    sessions,
    sessionSummary: waveSummary(sessions),
    /* Materialised per sync, so this is a read rather than a full-ledger scan. */
    findings: data.derived?.findings ?? [],
    components: (latest?.components ?? null) as unknown as Record<string, number> | null,
    insight,
    minted,
    wrapped,
    queue: untaggedQueue(
      recent.map((row) => ({
        externalId: row.externalId,
        symbol: row.symbol ?? "—",
        date: row.date ?? "",
        amount: row.amount ?? null,
        units: row.units ?? null,
        currency: row.currency ?? null,
      })),
      new Set(taggedDocs.map((tag) => tag.transactionId)),
    ),
    /*
     * One capability stands for the plan here: the five move together, so a
     * screen asking about five of them five times would be asking one question
     * badly. The routes still check their own.
     */
    pro: can({ tier: data.tier }, "publicationExport"),
  };
}

/* ── The two screens that are not the dashboard ───────────────────────────── */

function NoWayIn({ signedIn }: { signedIn: boolean }) {
  return (
    <PageGrid>
      <EmptyState
        eyebrow="Canopy"
        icon={signedIn ? "setup" : "signin"}
        title={signedIn ? "Configure the ledger store" : "Sign in to see your dashboard"}
        body={
          signedIn
            ? "Set MONGODB_URI on this deployment to store synced history and scores."
            : isAuthConfigured()
              ? "Your P&L, your holdings, your year and the patterns your own history is hiding."
              : "Sign-in is not configured on this deployment yet."
        }
        actions={[{ label: "Connect a brokerage", href: "/start", ghost: true }]}
      >
        {signedIn ? null : <SignInCta />}
      </EmptyState>
    </PageGrid>
  );
}

function NothingRead({
  data,
  children,
}: {
  data: ScreenData;
  children: React.ReactNode;
}) {
  const linked = Boolean(data.connection);
  return (
    <PageGrid>
      <EmptyState
        eyebrow="Canopy"
        icon={linked ? "waiting" : "connect"}
        title={linked ? "Nothing read yet" : "Connect a brokerage"}
        body={
          linked
            ? `Your ledger holds ${data.transactionCount.toLocaleString("en-US")} transactions. Scoring reads them and builds the dashboard.`
            : "One tap via SnapTrade, read-only. Positions and history arrive together."
        }
        actions={
          linked
            ? [{ label: "See your Wrapped", href: "/wrapped", ghost: true }]
            : [{ label: "Connect a brokerage", href: "/start" }]
        }
      >
        {/*
          * A connected account with nothing read is a screen the reader can
          * act on, not a note telling them to wait for a cron. The first sync
          * scores as it finishes, so this is the fallback rather than the
          * usual path.
          */}
        {linked ? <FirstScore /> : null}
      </EmptyState>
      {children}
    </PageGrid>
  );
}
