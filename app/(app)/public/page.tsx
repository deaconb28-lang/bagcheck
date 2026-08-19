import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/auth";
import { isDbConfigured, syncClock } from "@/lib/db";
import { loadShellConnection } from "@/lib/db";
import { AppNav } from "@/components/app/AppNav";
import { shellUser } from "@/components/app/shellUser";
import styles from "./public.module.css";

export const metadata: Metadata = { title: "Public" };
export const dynamic = "force-dynamic";

/**
 * The Public tab.
 *
 * It pointed at `/profile#ledger` — a settings anchor, which is a tab that
 * lands you in a form rather than at a place. This is the place: what a public
 * ledger will be, and the one control that reserves your name for it.
 *
 * Not behind the subscription gate. It sells something that does not exist
 * yet, so charging to look at it would be the wrong way round.
 */
export default async function PublicPage() {
  const userId = await getUserId();
  const connection = userId && isDbConfigured() ? await loadShellConnection(userId) : null;

  return (
    <>
      <AppNav
        active="ledger"
        accounts={connection ? 1 : 0}
        syncedAt={syncClock(null)}
        user={await shellUser()}
      />

      <main className={styles.page}>
        <p className={styles.eyebrow}>Public ledger</p>
        <h1 className={styles.title}>Coming soon</h1>
        <p className={styles.tail}>
          A page at your own handle: weights and returns. Never balances, trades
          or dates.
        </p>
        <Link href="/profile#ledger" className={styles.cta}>
          Reserve your handle
        </Link>
      </main>
    </>
  );
}
