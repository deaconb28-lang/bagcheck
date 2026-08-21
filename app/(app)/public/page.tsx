import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadShellConnection, syncClock } from "@/lib/db";
import { AppNav } from "@/components/app/AppNav";
import { shellUser } from "@/components/app/shellUser";
import { HandleCard } from "./HandleCard";
import { ReserveHandle } from "./ReserveHandle";
import styles from "./public.module.css";

export const metadata: Metadata = { title: "Public" };
export const dynamic = "force-dynamic";

/**
 * ── The Public tab ──
 *
 * It was an eyebrow, the words "Coming soon", one sentence and a link into a
 * settings anchor. Everything true about it is still true and none of it was
 * shown: a handle is a thing you own, exactly one person can have each name,
 * and what a public ledger will and will not say about you is a decision
 * somebody should be able to read before they make it.
 *
 * So the page leads with the name as an object — a card with the handle across
 * it and its facts in the corners — and reserving happens underneath it rather
 * than on another screen. Below that, three drawn panels state the whole
 * contract: what is on it, what never is, and who can see it.
 *
 * Not behind the subscription gate. It sells something that does not exist
 * yet, so charging to look at it would be the wrong way round.
 */
export default async function PublicPage() {
  const userId = await getUserId();
  const [connection, prefs] = await Promise.all([
    userId && isDbConfigured() ? loadShellConnection(userId) : null,
    userId && isDbConfigured()
      ? getCollections().then((c) =>
          c.prefs.findOne({ userId }, { projection: { _id: 0, handle: 1, publicLedger: 1 } }),
        )
      : null,
  ]);
  const handle = (prefs?.handle as string | undefined) ?? null;

  return (
    <>
      <AppNav
        active="ledger"
        handle={handle}
        accounts={connection ? 1 : 0}
        syncedAt={syncClock(null)}
        user={await shellUser()}
      />

      <main className={styles.page}>
        <div className={styles.stage} data-reveal>
          <HandleCard handle={handle} at={new Date()} />
        </div>

        <div className={styles.lede} data-reveal>
          <h1 className={styles.title}>
            {handle ? (
              <>
                @{handle} is
                <br />
                reserved.
              </>
            ) : (
              <>
                Reserve your
                <br />
                supercruise handle.
              </>
            )}
          </h1>
          <p className={styles.sub}>
            {handle
              ? "Nobody else can take it. Your ledger goes live at that address when public ledgers ship."
              : "Pick the name your ledger will live at. One per person, and it is yours from the moment you take it."}
          </p>
          <ReserveHandle handle={handle} />
          {/*
            * Reserving is not publishing, and the difference has to be on the
            * screen where somebody reserves. The store keeps two fields for
            * exactly this reason and only one of them is written here.
            */}
          <p className={styles.fine}>
            Reserving a name publishes nothing. Turning the page on is a separate switch in
            your profile, and it is off.
          </p>
        </div>

        {/*
          * ── The contract, in three panels ──
          *
          * A public page about somebody's money has to state its own limits
          * before it asks for anything, and a list of bullet points is the
          * least-read way to do that. Each panel carries a drawing of the
          * thing it is describing, and every drawing is shapes — **no
          * numerals anywhere**, because a plausible figure on the page that
          * promises restraint about figures is the worst place in the product
          * to print one.
          */}
        <section className={styles.contract} aria-labelledby="contract" data-reveal>
          <h2 className={styles.contractHead} id="contract">
            What a public ledger is
          </h2>

          <div className={styles.panels}>
            <article className={styles.panel} data-tone="moss">
              <span className={styles.art} aria-hidden="true">
                <ShapeWeights />
              </span>
              <h3 className={styles.panelHead}>What is on it</h3>
              <p className={styles.panelBody}>
                The names you hold, what share of the book each one is, and what each has
                done. Your score, and the archetype it reads as.
              </p>
            </article>

            <article className={styles.panel} data-tone="loss">
              <span className={styles.art} aria-hidden="true">
                <ShapeStruck />
              </span>
              <h3 className={styles.panelHead}>What never is</h3>
              <p className={styles.panelBody}>
                No balance, no dollar figure, no trade, no date, no broker. A stranger can
                see how you invest and never how much.
              </p>
            </article>

            <article className={styles.panel} data-tone="signal">
              <span className={styles.art} aria-hidden="true">
                <ShapeSwitch />
              </span>
              <h3 className={styles.panelHead}>Who can see it</h3>
              <p className={styles.panelBody}>
                Anyone with the link, once you switch it on. Off, the address answers the
                same way an unclaimed one does — nothing.
              </p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}

/* ── The three drawings. Shapes only; no drawing here carries a numeral. ── */

function ShapeWeights() {
  return (
    <svg viewBox="0 0 64 44" fill="none" aria-hidden="true">
      {[
        [0, 34],
        [17, 22],
        [30, 14],
        [40, 9],
        [48, 6],
      ].map(([x, w], i) => (
        <rect
          key={x}
          x={x}
          y={12}
          width={w - 2}
          height={20}
          rx={4}
          fill="currentColor"
          opacity={1 - i * 0.16}
        />
      ))}
    </svg>
  );
}

function ShapeStruck() {
  return (
    <svg viewBox="0 0 64 44" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="36" height="6" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="4" y="21" width="52" height="6" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="4" y="32" width="28" height="6" rx="3" fill="currentColor" opacity="0.35" />
      <path d="M6 40 L58 6" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

function ShapeSwitch() {
  return (
    <svg viewBox="0 0 64 44" fill="none" aria-hidden="true">
      <rect
        x="8"
        y="12"
        width="48"
        height="22"
        rx="11"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.45"
      />
      <circle cx="19" cy="23" r="6.5" fill="currentColor" />
    </svg>
  );
}
