import Link from "next/link";
import { getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured, linkedBrokerage } from "@/lib/db";
import { isSnapTradeConfigured } from "@/lib/snaptrade";
import { appLocked } from "@/lib/launch";
import { SupercruiseMark } from "@/components/brand/SupercruiseMark";
import { GoogleSignIn } from "@/components/app/GoogleSignIn";
import { DancingCards } from "./DancingCards";
import { ConnectButton } from "./ConnectButton";
import shell from "../flex.module.css";
import styles from "./start.module.css";

export const dynamic = "force-dynamic";

/** What a failed round trip is allowed to say. Codes, never raw errors. */
const ERRORS: Record<string, string> = {
  session:
    "The sign-in expired on the way back from your broker. Signing in again picks up where you left off — nothing was lost.",
  portal:
    "Your broker's connection portal did not open. Nothing was linked and nothing was charged; trying again is safe.",
};

/**
 * Step one: connect a brokerage.
 *
 * The whole screen is one decision, so there is one panel and one button on
 * it. Everything a first-time visitor needs to say yes is on that panel —
 * what gets read, what never happens, how long it takes, and that it is asked
 * once — because the objection to linking a brokerage is always the same
 * objection, and burying the answer a click away loses the person who had it.
 *
 * Read-only is stated twice on purpose: once as a promise and once as a fact
 * about the integration. It is the single most load-bearing sentence here.
 *
 * Four real states, and the screen shows exactly one: already linked, signed
 * in and ready to link, signed out, or — on a deployment missing a credential
 * — the sample year instead of a dead end.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const userId = await getUserId();
  const linked = userId && isDbConfigured() ? await linkedBrokerage(userId) : null;
  const canLink = isSnapTradeConfigured() && (Boolean(userId) || isAuthConfigured());
  /* Read per request, server-side. The flag never reaches the client. */
  const dashboardOpen = !appLocked();
  const problem = error ? ERRORS[error] : null;

  /*
   * Someone who has already linked is not asked again — the whole promise of
   * this screen is that it happens once, and showing them the same button
   * would contradict it on the one screen that made the claim.
   */
  if (linked) {
    return (
      <>
        <DancingCards />
        <Header step="Linked" />
        <main className={styles.main}>
          <div className={styles.panel}>
            <span className={styles.eyebrow}>CONNECTED</span>
            <h1 className={styles.h1}>
              That&rsquo;s the only time
              <br />
              you&rsquo;ll do that.
            </h1>
            <p className={styles.lede}>
              {institutionLine(linked.institutions, linked.accounts)} It stays
              linked to your Google account, so Supercruise keeps reading new
              fills on its own — there is nothing to connect again.
            </p>
            {/*
              * Setup ends in the dashboard. Wrapped is right there on it — a
              * panel of its own directly under the summary row — so sending
              * someone straight to the cards used to drop them on a screen
              * with no way back into the product they had just set up.
              *
              * Unless the dashboard is not open. This screen is in `(flex)`,
              * which sits outside the launch lock so a signed-out visitor can
              * reach it; `/you` is in `(app)`, which sits behind it. While
              * the flag is off, offering this door produces exactly the loop
              * the flag's own documentation warns about — connect, sync,
              * press "Open your dashboard", land back on the marketing page
              * with nothing said. An affordance that will refuse you is
              * absent, not present, which is the rule the locked cards
              * already follow.
              */}
            <div className={styles.actions}>
              {dashboardOpen ? (
                <>
                  <Link className={styles.primary} href="/you">
                    Open your dashboard
                    <Arrow />
                  </Link>
                  <Link className={styles.secondary} href="/wrapped">
                    See your Wrapped
                  </Link>
                </>
              ) : (
                <Link className={styles.primary} href="/wrapped">
                  See your Wrapped
                  <Arrow />
                </Link>
              )}
            </div>
            <p className={styles.fine}>
              {linked.lastSyncAt
                ? `Last read ${linked.lastSyncAt.toISOString().slice(0, 10)}.`
                : "First read runs when you open your dashboard."}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DancingCards />
      {/*
        * The counter says which step you are actually on. It read "Step 1 of
        * 2" for everybody, including someone already signed in with one thing
        * left to do — a progress indicator that never progresses is worse
        * than none, because it quietly says the flow is longer than it is.
        */}
      <Header step={userId ? "Step 2 of 2 · Connect" : "Step 1 of 2 · Sign in"} />

      <main className={styles.main}>
        <div className={styles.panel}>
          <span className={styles.eyebrow}>{userId ? "ONE STEP LEFT" : "CONNECT"}</span>
          <h1 className={styles.h1}>
            {userId ? (
              <>
                Link your broker
                <br />
                and your year is done.
              </>
            ) : (
              <>
                Your year is already
                <br />
                in your order history.
              </>
            )}
          </h1>
          <p className={styles.lede}>
            We read your filled orders through SnapTrade. About thirty seconds.
          </p>

          {problem ? (
            <p className={styles.warn} role="status">
              {problem}
            </p>
          ) : null}

          {/*
            * Signed in, the action goes above the four facts rather than
            * below them. The facts answer the objection to *linking a
            * brokerage*, which is the right thing to say to someone deciding
            * — and the wrong thing to make someone scroll past who has
            * already decided and come back from Google to finish.
            */}
          {userId && canLink ? (
            <div className={styles.actions} data-lead="">
              <ConnectButton />
              <a className={styles.secondary} href="/wrapped?demo=1">
                See a sample year first
              </a>
            </div>
          ) : null}

          <ul className={styles.facts}>
            <li>
              <Tick />
              <span>
                <b>You do this once.</b> New fills arrive on their own.
              </span>
            </li>
            <li>
              <Tick />
              <span>
                <b>Read-only, permanently.</b> It cannot trade or move money.
              </span>
            </li>
            <li>
              <Tick />
              <span>
                <b>Your login stays with your broker.</b> We never see a password.
              </span>
            </li>
            <li>
              <Tick />
              <span>
                <b>Unlink any time.</b> That stops the sync and clears the history.
              </span>
            </li>
          </ul>

          <div className={styles.actions}>
            {!canLink ? (
              <>
                <a className={styles.primary} href="/wrapped?demo=1">
                  See a sample year
                </a>
                <p className={styles.warn}>
                  Linking is not open here yet. The sample comes off an example
                  ledger and says so.
                </p>
              </>
            ) : userId ? (
              /* Already offered above the facts — one button, not two. */
              null
            ) : (
              <>
                {/*
                  * Sign in first: SnapTrade mints a portal session against an
                  * identity, so there has to be one before a broker can be
                  * linked to it. One step, named for what it does.
                  */}
                <GoogleSignIn redirectTo="/start" className={styles.primary} />
                <a className={styles.secondary} href="/wrapped?demo=1">
                  See a sample year first
                </a>
              </>
            )}
          </div>

          <p className={styles.fine}>
            Robinhood, Fidelity, Schwab, Coinbase and 20+ others.
          </p>
        </div>
      </main>
    </>
  );
}

/** Names what is linked without pretending to know more than the ledger does. */
function institutionLine(institutions: string[], accounts: number): string {
  const where = institutions.length
    ? institutions.slice(0, 2).join(" and ")
    : "Your brokerage";
  const many = accounts === 1 ? "one account" : `${accounts} accounts`;
  return `${where} is connected, ${many} deep.`;
}

function Header({ step }: { step: string }) {
  return (
    <header className={shell.bar}>
      <Link href="/" className={shell.brand}>
        <SupercruiseMark size={26} />
        <span className={shell.wordmark}>supercruise</span>
      </Link>
      <span className={shell.barNote}>{step}</span>
    </header>
  );
}

function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--mk-green-soft)"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}
