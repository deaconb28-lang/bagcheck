import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedHandle } from "@/lib/db/publicLedger";
import { SteadyhandsMark } from "@/components/brand/SteadyhandsMark";
import styles from "./handle.module.css";

/**
 * Somebody's claimed name, in public, at `/@handle`.
 *
 * It used to render their whole book — return on cost, ten holdings with
 * weights and P&L, a sector split. That is built and tested and it is not what
 * this page is for yet: the surface is a reserved name and a promise, so the
 * page says exactly that and nothing else. Everything it stops showing is a
 * fact about somebody's account, which makes "simpler" and "safer" the same
 * change here — there is now no figure on this page at all, so there is
 * nothing on it a stranger can learn.
 *
 * `publicLedgerFor` stays in the data layer, unused by this route. It is the
 * shape the page returns to, and deleting it to re-derive it later would throw
 * away the part that was hard: deciding what a stranger may see.
 *
 * A dynamic segment at the root catches anything no static route claimed, so
 * the first thing it does is refuse everything that is not a handle. Next
 * gives static segments precedence, so `/you` and `/wrapped` never reach here;
 * `/nonsense` does, and gets a 404 rather than a database lookup.
 *
 * `@` is not in the folder name on purpose: `app/@handle` is a *parallel route
 * slot* in this framework, not a path. The `@` lives in the URL and is
 * stripped here.
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

function handleOf(segment: string): string | null {
  const decoded = decodeURIComponent(segment);
  return decoded.startsWith("@") ? decoded.slice(1) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle: segment } = await params;
  const handle = handleOf(segment);
  if (!handle) return {};
  const claimed = await publishedHandle(handle);
  if (!claimed) return {};
  return {
    title: `@${claimed} · steadyhands`,
    description: "A public ledger, read off a brokerage. Coming soon.",
  };
}

export default async function PublicLedgerPage({ params }: Props) {
  const { handle: segment } = await params;
  const handle = handleOf(segment);
  if (!handle) notFound();

  /*
   * Claimed and published, or nothing. An unclaimed handle and an unpublished
   * one read the same from outside, which is what stops this route answering
   * "is that name taken?" for anybody who asks.
   */
  const claimed = await publishedHandle(handle);
  if (!claimed) notFound();

  return (
    <main className={styles.page}>
      <span className={styles.mark} aria-hidden="true">
        <SteadyhandsMark size={34} ground="var(--mk-field)" />
      </span>

      <p className={styles.eyebrow}>reserved</p>
      <h1 className={styles.handle}>@{claimed}</h1>

      <p className={styles.soon}>Public ledgers are coming soon.</p>
      <p className={styles.tail}>
        This name is held. When it opens, it will show what this account holds
        as weights and returns — never balances, never trades, never dates.
      </p>

      <div className={styles.actions}>
        <Link href="/start" className={styles.cta}>
          Claim your handle
        </Link>
        <Link href="/" className={styles.ghost}>
          What steadyhands is
        </Link>
      </div>
    </main>
  );
}
