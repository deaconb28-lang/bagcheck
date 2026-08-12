import Link from "next/link";
import { getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured, linkedBrokerage } from "@/lib/db";
import { isSnapTradeConfigured } from "@/lib/snaptrade";
import { BagMark } from "@/app/(marketing)/BagMark";
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
              linked to your Google account, so bagcheck keeps reading new
              fills on its own — there is nothing to connect again.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/wrapped">
                Open your Wrapped
                <Arrow />
              </Link>
              <a className={styles.secondary} href="/api/snaptrade/connect">
                Link another brokerage
              </a>
            </div>
            <p className={styles.fine}>
              {linked.lastSyncAt
                ? `Last read ${linked.lastSyncAt.toISOString().slice(0, 10)}.`
                : "First read runs when you open your Wrapped."}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DancingCards />
      <Header step="Step 1 of 2" />

      <main className={styles.main}>
        <div className={styles.panel}>
          <span className={styles.eyebrow}>CONNECT</span>
          <h1 className={styles.h1}>
            Your year is already
            <br />
            in your order history.
          </h1>
          <p className={styles.lede}>
            bagcheck reads your filled orders through SnapTrade and makes a card
            out of everything the year can prove. Most accounts take about
            thirty seconds.
          </p>

          {problem ? (
            <p className={styles.warn} role="status">
              {problem}
            </p>
          ) : null}

          <ul className={styles.facts}>
            <li>
              <Tick />
              <span>
                <b>You do this once.</b> The link belongs to your Google
                account, so every visit after this one opens straight onto your
                cards. New fills arrive on their own.
              </span>
            </li>
            <li>
              <Tick />
              <span>
                <b>Read-only, permanently.</b> bagcheck sees filled orders and
                positions. It cannot place a trade, move money, or change a
                setting.
              </span>
            </li>
            <li>
              <Tick />
              <span>
                <b>Your login stays with your broker.</b> SnapTrade handles the
                sign-in; bagcheck never receives a password.
              </span>
            </li>
            <li>
              <Tick />
              <span>
                <b>Unlink any time.</b> That stops the sync and takes the
                history out of bagcheck.
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
                  Brokerage linking is not open on this deployment yet. The
                  sample year comes off an example ledger, and says so on every
                  card.
                </p>
              </>
            ) : userId ? (
              <>
                <ConnectButton />
                <a className={styles.secondary} href="/wrapped?demo=1">
                  See a sample year first
                </a>
              </>
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
        <BagMark size={26} />
        <span className={shell.wordmark}>bagcheck</span>
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
