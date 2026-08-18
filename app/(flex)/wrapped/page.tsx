import Link from "next/link";
import { auth, getUserId, isAuthConfigured } from "@/auth";
import { accessFor, getCollections, isDbConfigured, syncClock } from "@/lib/db";
import { appLocked } from "@/lib/launch";
import { wrappedDeck } from "@/lib/wrapped/year";
import { windowFor, windowsFor } from "@/lib/wrapped/window";
import { SteadyhandsMark } from "@/components/brand/SteadyhandsMark";
import { GoogleSignIn } from "@/components/app/GoogleSignIn";
import { AppNav } from "@/components/app/AppNav";
import { Paywall } from "@/components/app/Paywall";
import { shellUser } from "@/components/app/shellUser";
import { CardFonts } from "@/components/cards/CardFonts";
import { StillToCome } from "./StillToCome";
import { YearDeck } from "./YearDeck";
import { FirstRun } from "./FirstRun";
import { ComingSoon } from "./ComingSoon";
import styles from "./wrapped.module.css";

export const dynamic = "force-dynamic";

/**
 * Step two: your year, as cards.
 *
 * **The page is the sheet; the player is the reader.** Browsing twelve
 * artefacts and reading one are different jobs, and an early build asked a
 * single horizontal snap rail to do both — which meant a desktop saw one and a
 * half cards and the only way to reach card nine was nine presses.
 *
 * Now the rail lies the whole set out under its frame numbers, and either the
 * play button or any card opens the player at that frame. Nothing above the
 * cards is prose.
 *
 * Each card is a finished 1080x1920 document from the Wrapped pipeline —
 * stats computed in our code, one caption per card from the model, every
 * figure checked character for character against the stats before it is
 * allowed on screen. The page frames them and does not draw them.
 *
 * Three ways in, each landing on a real set. A connected account gets its own
 * cards; a visitor or `?demo=1` gets the sample year, marked as one on every
 * card's own face; a connected account that has earned nothing yet gets said
 * so rather than handed the sample, because a sample deck under someone's own
 * greeting reads as their year having arrived wrong.
 */
export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; connected?: string; w?: string }>;
}) {
  const { demo, connected, w } = await searchParams;
  const userId = await getUserId();
  const year = new Date().getUTCFullYear();

  /*
   * One loader for both decks. A connected account gets its own twelve; a
   * visitor, or `?demo=1`, gets the sample year — computed by the same
   * `wrappedStats` off a sample ledger, and every card in it says so on its
   * own face rather than only in a line under the rail.
   */
  /*
   * The subscription gate — for a signed-in reader only.
   *
   * A signed-out visitor still gets the sample deck, and that is deliberate:
   * the landing hands off to this route directly, so gating it on a session
   * would put a pay screen in front of someone who has not been shown
   * anything yet. What is gated is a reader asking for *their own* year after
   * their free month ran out.
   */
  if (userId && isDbConfigured()) {
    const access = await accessFor(userId);
    if (!access.allowed) return <Paywall trial={access.trial} />;
  }

  const asDemo = demo === "1" || !isDbConfigured();
  /*
   * Which slice of the year. A quarter is a window a new account can actually
   * fill — a reader who connected in March has no year yet and can do nothing
   * about it until December, but they have a Q1. An unknown or not-yet-started
   * key resolves to the year rather than to an empty deck.
   */
  const now = new Date();
  const win = windowFor(year, w, now);
  const windows = windowsFor(year, now);
  const { cards, example } = await wrappedDeck(userId, year, {
    example: asDemo,
    window: win,
  });

  /*
   * The reader has an account and the loader still fell back to the sample —
   * so they have nothing of their own yet. That is a different screen from a
   * visitor browsing the demo, and it must not be the same one: the sample
   * deck standing in for an empty year would read as their year having come
   * back wrong.
   */
  const nothingEarned = Boolean(userId) && !asDemo && example;

  /*
   * Straight off the connection portal: greet, run the first read, and let
   * the cards fill in underneath. The greeting is the only place the flow
   * knows the reader's name, and it is the moment the connect-once promise
   * becomes true, so it is made here as well as on the screen before.
   */
  const firstRun =
    connected === "1" && userId ? (
      <FirstRun name={await firstName()} dashboardOpen={!appLocked()} />
    ) : null;

  /*
   * Mid-first-read there is nothing of the reader's to show yet, and the
   * example deck must not stand in for it: sample cards stamped "Example"
   * under "Hey Deacon" reads as their year having arrived wrong. The greeting
   * holds the screen alone until the sync writes something, and the refresh
   * it fires at the end is what brings the cards in.
   */
  if (firstRun && example) {
    return (
      <>
        <Bar label={win.label} userId={userId} />
        <main className={styles.main}>
          <div className={styles.page}>{firstRun}</div>
        </main>
      </>
    );
  }

  if (nothingEarned) {
    return (
      <>
        <Bar label={win.label} userId={userId} />
        {/*
          * A year that has minted nothing is still a year in progress, and it
          * gets the same screen as one that has minted eleven — the deck is
          * empty, and every frame is listed under it with the one condition
          * that mints it.
          *
          * It used to be a dead end: a heading saying nothing had been earned,
          * two buttons, and no sight of what the twelve cards even are. That is
          * the worst screen to hand someone who has just connected an account,
          * because it reads as the product having nothing to offer them rather
          * than as a year that has not happened yet. Nothing here invents a
          * figure — `StillToCome` rows carry a drawn teaser, a name and a
          * requirement, and never a number.
          */}
        <main className={styles.main}>
          <div className={styles.page}>
            <h1 className={styles.emptyTitle}>Your year is still filling in</h1>
            <p className={styles.emptyBody}>
              A card needs behaviour the ledger can prove, so a short history
              stays quiet rather than inventing one. Here is the whole set and
              what mints each — they arrive as your history does.
            </p>
            <div className={styles.emptyActions}>
              <Link className={styles.primary} href="/start">
                Connect another account
              </Link>
              <Link className={styles.secondary} href="/wrapped?demo=1">
                See a sample year
              </Link>
            </div>

            {/*
              * The windows, as links rather than state. A window is a place you
              * can be sent to and share, and making it component state would
              * cost this page its server rendering for the sake of five buttons.
              * Only windows that have begun are offered — an empty deck for a
              * quarter that cannot hold anything is a dead end with a date on it.
              */}
            {example ? null : (
              <nav className={styles.windows} aria-label="Wrapped window">
                {windows.map((option) => (
                  <Link
                    key={option.key}
                    href={option.key === "year" ? "/wrapped" : `/wrapped?w=${option.key}`}
                    className={styles.window}
                    data-active={option.key === win.key || undefined}
                    aria-current={option.key === win.key ? "page" : undefined}
                  >
                    {option.key === "year" ? String(year) : option.label.split(" ")[0]}
                  </Link>
                ))}
              </nav>
            )}

            <StillToCome earned={[]} />
          </div>
        </main>
      </>
    );
  }

  const label = win.label;

  return (
    <>
      <Bar label={label} example={example} userId={userId} />
      <main className={styles.main}>
        <div className={styles.page}>
          {firstRun}
          <CardFonts />
          {/*
            * The windows, as links rather than state. A window is a place you
            * can be sent to and share, and making it component state would
            * cost this page its server rendering for the sake of five buttons.
            * Only windows that have begun are offered — an empty deck for a
            * quarter that cannot hold anything is a dead end with a date on it.
            */}
          {example ? null : (
            <nav className={styles.windows} aria-label="Wrapped window">
              {windows.map((option) => (
                <Link
                  key={option.key}
                  href={option.key === "year" ? "/wrapped" : `/wrapped?w=${option.key}`}
                  className={styles.window}
                  data-active={option.key === win.key || undefined}
                  aria-current={option.key === win.key ? "page" : undefined}
                >
                  {option.key === "year" ? String(year) : option.label.split(" ")[0]}
                </Link>
              ))}
            </nav>
          )}

          <YearDeck cards={cards} year={year} />

          {/*
            * What the year has not minted, as rows rather than as locked
            * frames in the deck. A deck that is part artefact and part
            * inventory is neither.
            */}
          {example ? null : <StillToCome earned={cards.map((c) => c.no)} />}

          {/*
            * What Wrapped is the first chapter of. It sits below the sheet
            * because the cards are what the reader came for.
            */}
          <ComingSoon />
        </div>

        {/*
          * The tail. Everything that is not a card lives below the sheet, in
          * one quiet row — the reader came for the cards and gets them first.
          */}
        <footer className={styles.tail}>
          {example ? (
            <>
              <p>
                Every figure here comes off an example ledger, and every card
                says so. Connect a brokerage and these become yours.
              </p>
              <Link className={styles.tailCta} href="/start">
                Connect a brokerage
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h13" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          ) : (
            <p>
              Every card your year earned, off read-only brokerage data. Your
              brokerage stays linked to this account, so new fills arrive on
              their own — you never connect it again. Sharing is never behind a
              plan.
            </p>
          )}
        </footer>
      </main>
    </>
  );
}

/**
 * The signed-in reader's first name, for the greeting and nothing else.
 *
 * Falls back to "there" rather than to an email address or an id — a greeting
 * that says hello to a string nobody chose is worse than a generic one.
 */
async function firstName(): Promise<string> {
  if (!isAuthConfigured()) return "there";
  try {
    const session = await auth();
    const raw = session?.user?.name?.trim() || session?.user?.email?.split("@")[0];
    if (!raw) return "there";
    return raw.split(/\s+/)[0];
  } catch (err) {
    console.error("[wrapped] session lookup failed", err);
    return "there";
  }
}

/**
 * One line of chrome: the mark, what you are reading, and the way into the
 * app.
 *
 * The way in is the part that was missing. A reader who arrived here from the
 * landing had no door to the product and no way to sign in without going
 * back — so a signed-out visitor gets one-click Google, and a signed-in one
 * gets the dashboard.
 */
async function Bar({
  label,
  example,
  userId,
}: {
  label: string;
  example?: boolean;
  /** Null when signed out. Also the filter every read below is scoped by. */
  userId: string | null;
}) {
  const signedIn = Boolean(userId);
  /*
   * A signed-in reader gets the app's own nav, because Wrapped is one of the
   * four tabs and arriving here should not feel like leaving the product. A
   * signed-out visitor gets the bar: the landing hands off to this page
   * directly, and a nav whose every tab would bounce them to a sign-in is
   * chrome that only knows how to refuse.
   */
  if (signedIn && isDbConfigured()) {
    const { connections } = await getCollections();
    const conn = await connections
      .findOne({ userId: userId! }, { projection: { _id: 0, accounts: 1, lastSyncAt: 1 } })
      .catch(() => null);
    return (
      <AppNav
        active="wrapped"
        accounts={conn?.accounts?.length ?? 0}
        syncedAt={syncClock(conn?.lastSyncAt ?? null)}
        user={await shellUser()}
      />
    );
  }

  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label="steadyhands home">
        <SteadyhandsMark size={24} />
        <span>steadyhands</span>
      </Link>
      <span className={styles.barLabel}>
        {example ? "Sample year" : "Wrapped"} · {label}
      </span>
      {signedIn ? (
        <Link href="/you" className={styles.barCta}>
          Dashboard
        </Link>
      ) : isAuthConfigured() ? (
        <GoogleSignIn redirectTo="/you" className={styles.barCta}>Sign in</GoogleSignIn>
      ) : null}
    </header>
  );
}
