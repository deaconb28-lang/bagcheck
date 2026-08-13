import Link from "next/link";
import { auth, getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured } from "@/lib/db";
import { buildCards } from "@/lib/cards";
import { exampleLedger } from "@/lib/cards/exampleLedger";
import { assembleWrapped } from "@/lib/wrapped/assemble";
import { storedPhotos } from "@/lib/unsplash";
import { BagMark } from "@/app/(marketing)/BagMark";
import { GoogleSignIn } from "@/components/app/GoogleSignIn";
import { Deck } from "./Deck";
import { FirstRun } from "./FirstRun";
import { ComingSoon } from "./ComingSoon";
import styles from "./wrapped.module.css";

export const dynamic = "force-dynamic";

/**
 * Step two: your year, as cards.
 *
 * **The page is the sheet; the player is the reader.** Browsing thirteen
 * artefacts and reading one are different jobs, and the build before this
 * asked a single horizontal snap rail to do both — which meant a desktop saw
 * one and a half cards, a third of the width sat empty, and the only way to
 * reach card nine was nine presses or one of thirteen anonymous dashes.
 *
 * Now the cover leads beside the year, the rest lie out under their frame
 * numbers, and either the play button or any card opens the player at that
 * frame. Nothing above the cards is prose.
 *
 * Three ways in, each landing on a real set. A connected account gets its own
 * cards; `?demo=1` gets the example ledger with "Example" on every card;
 * someone with nothing synced is sent back to step one, because the next move
 * there is a brokerage rather than a message.
 */
export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; connected?: string }>;
}) {
  const { demo, connected } = await searchParams;
  const userId = await getUserId();
  const year = new Date().getUTCFullYear();

  const assembled =
    demo === "1" || !userId || !isDbConfigured() ? null : await assembleWrapped(userId);

  const example = !assembled;
  const cards = assembled?.cards ?? buildCards(exampleLedger(year));
  /*
   * Read-only, and never a call to Unsplash: rendering a page must not spend
   * quota. An empty store just means the cards wear their drawn artwork.
   */
  const photos = await storedPhotos();

  /*
   * Straight off the connection portal: greet, run the first read, and let
   * the cards fill in underneath. The greeting is the only place the flow
   * knows the reader's name, and it is the moment the connect-once promise
   * becomes true, so it is made here as well as on the screen before.
   */
  const firstRun = connected === "1" && userId ? <FirstRun name={await firstName()} /> : null;

  /*
   * Mid-first-read there is nothing of the reader's to show yet, and the
   * example deck must not stand in for it: sample cards stamped "Example"
   * under "Hey Deacon" reads as their year having arrived wrong. The greeting
   * holds the screen alone until the sync writes something, and the refresh
   * it fires at the end is what brings the cards in.
   */
  if (firstRun && (example || cards.length === 0)) {
    return (
      <>
        <Bar label={String(year)} signedIn={Boolean(userId)} />
        <main className={styles.main}>
          <div className={styles.page}>{firstRun}</div>
        </main>
      </>
    );
  }

  if (!example && cards.length === 0) {
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

  const label = assembled?.label ?? String(year);
  const provenance = example
    ? "Example ledger · not anyone's record"
    : "Read-only brokerage data via SnapTrade";

  /*
   * The cover card already states the year's counts in its own lede, so the
   * hero borrows that line rather than recomputing it — one number, one
   * source, and no chance of the page and the card disagreeing.
   */
  const stat =
    cards.find((c) => c.kind === "wrapped")?.lede ?? `${cards.length} cards from your year.`;

  return (
    <>
      <Bar label={label} example={example} signedIn={Boolean(userId)} />
      <main className={styles.main}>
        <div className={styles.page}>
          {firstRun}
          <Deck
            cards={cards}
            example={example}
            provenance={provenance}
            photos={photos}
            year={label}
            stat={stat}
          />

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
        <BagMark size={24} />
        <span>bagcheck</span>
      </Link>
      <span className={styles.barLabel}>
        {example ? "Sample year" : "Wrapped"} · {label}
      </span>
      {signedIn ? (
        <Link href="/home" className={styles.barCta}>
          Dashboard
        </Link>
      ) : isAuthConfigured() ? (
        <GoogleSignIn redirectTo="/home" className={styles.barCta}>Sign in</GoogleSignIn>
      ) : null}
    </header>
  );
}
