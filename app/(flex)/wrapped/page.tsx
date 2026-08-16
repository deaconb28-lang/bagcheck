import Link from "next/link";
import { auth, getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured } from "@/lib/db";
import { appLocked } from "@/lib/launch";
import { wrappedDeck } from "@/lib/wrapped/year";
import { BagcheckMark } from "@/components/brand/BagcheckMark";
import { GoogleSignIn } from "@/components/app/GoogleSignIn";
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
  searchParams: Promise<{ demo?: string; connected?: string }>;
}) {
  const { demo, connected } = await searchParams;
  const userId = await getUserId();
  const year = new Date().getUTCFullYear();

  /*
   * One loader for both decks. A connected account gets its own twelve; a
   * visitor, or `?demo=1`, gets the sample year — computed by the same
   * `wrappedStats` off a sample ledger, and every card in it says so on its
   * own face rather than only in a line under the rail.
   */
  const asDemo = demo === "1" || !isDbConfigured();
  const { cards, example } = await wrappedDeck(userId, year, { example: asDemo });

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
        <Bar label={String(year)} signedIn={Boolean(userId)} />
        <main className={styles.main}>
          <div className={styles.page}>{firstRun}</div>
        </main>
      </>
    );
  }

  if (nothingEarned) {
    return (
      <>
        <Bar label={String(year)} signedIn={Boolean(userId)} />
        <main className={styles.empty}>
          <h1 className={styles.emptyTitle}>Nothing has been earned yet</h1>
          <p className={styles.emptyBody}>
            A card needs behaviour the ledger can prove, so a short history
            stays quiet rather than inventing one. Sync more of it, or read the
            sample year to see what turns up.
          </p>
          <div className={styles.emptyActions}>
            <Link className={styles.primary} href="/start">
              Connect another account
            </Link>
            <Link className={styles.secondary} href="/wrapped?demo=1">
              See a sample year
            </Link>
          </div>
        </main>
      </>
    );
  }

  const label = String(year);

  return (
    <>
      <Bar label={label} example={example} signedIn={Boolean(userId)} />
      <main className={styles.main}>
        <div className={styles.page}>
          {firstRun}
          <CardFonts />
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
function Bar({
  label,
  example,
  signedIn,
}: {
  label: string;
  example?: boolean;
  signedIn: boolean;
}) {
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label="bagcheck home">
        <BagcheckMark size={24} />
        <span>bagcheck</span>
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
