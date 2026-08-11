import Link from "next/link";
import { getUserId, isAuthConfigured } from "@/auth";
import { isSnapTradeConfigured } from "@/lib/snaptrade";
import { BagMark } from "@/app/(marketing)/BagMark";
import { DancingCards } from "./DancingCards";
import { ConnectButton } from "./ConnectButton";
import shell from "../flex.module.css";
import styles from "./start.module.css";

export const dynamic = "force-dynamic";

/**
 * Step one: connect a brokerage.
 *
 * The whole screen is one decision, so there is one panel and one button on
 * it. Everything a first-time visitor needs to say yes is on that panel —
 * what gets read, what never happens, and how long it takes — because the
 * objection to linking a brokerage is always the same objection, and burying
 * the answer a click away loses the person who had it.
 *
 * Read-only is stated twice on purpose: once as a promise and once as a fact
 * about the integration. It is the single most load-bearing sentence here.
 */
export default async function StartPage() {
  const userId = await getUserId();
  /*
   * Linking needs both halves: a broker integration to talk to, and an
   * identity to hang the connection on. With SnapTrade keys but no sign-in
   * there is nobody to mint a portal session for, so the screen offers the
   * sample year rather than a button that cannot finish.
   */
  const ready = isSnapTradeConfigured() && (Boolean(userId) || isAuthConfigured());

  return (
    <>
      <DancingCards />

      <header className={shell.bar}>
        <Link href="/" className={shell.brand}>
          <BagMark size={26} />
          <span className={shell.wordmark}>bagcheck</span>
        </Link>
        <span className={shell.barNote}>Step 1 of 2</span>
      </header>

      <main className={styles.main}>
        <div className={styles.panel}>
          <span className={styles.eyebrow}>CONNECT</span>
          <h1 className={styles.h1}>
            Link a brokerage.
            <br />
            Get your year back.
          </h1>
          <p className={styles.lede}>
            bagcheck reads your filled orders through SnapTrade and builds
            twelve cards from what it finds. Most accounts take about thirty
            seconds.
          </p>

          <ul className={styles.facts}>
            <li>
              <Tick />
              <span>
                <b>Read-only, permanently.</b> bagcheck can see filled orders and
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
                <b>Disconnect whenever.</b> Unlinking stops the sync and removes
                the history from bagcheck.
              </span>
            </li>
          </ul>

          <ConnectButton signedIn={Boolean(userId)} ready={ready} />

          <p className={styles.fine}>
            Robinhood, Fidelity, Schwab, Coinbase and 20+ others.
          </p>
        </div>
      </main>
    </>
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
