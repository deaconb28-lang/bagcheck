import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/auth";
import { isDbConfigured, loadActivity, loadAppData } from "@/lib/db";
import { Card, Eyebrow, Stat } from "@/components/primitives";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { PageHeader } from "@/components/app/PageHeader";
import { SignInCta } from "@/components/app/SignInCta";
import { LedgerRow } from "./LedgerRow";
import styles from "./activity.module.css";

export const metadata: Metadata = { title: "Bagcheck — activity" };
export const dynamic = "force-dynamic";

const PAGE = 50;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string }>;
}) {
  const userId = await getUserId();

  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · activity"
          title="Nothing to show yet"
          body={
            userId
              ? "The ledger store is not configured on this deployment."
              : "Sign in to see your ledger."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const params = await searchParams;
  const page = Math.max(0, Number(params.page ?? 0) || 0);
  const kind = params.kind;

  const [{ rows, total, kinds }, { connection }] = await Promise.all([
    loadActivity(userId, { limit: PAGE, skip: page * PAGE, kind }),
    loadAppData(userId, 1),
  ]);

  if (total === 0 && !kind) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · activity"
          title={connection ? "No transactions synced" : "Connect a brokerage"}
          body={
            connection
              ? "Run a sync to pull your full transaction history from the brokerage."
              : "One tap via SnapTrade, read-only. Years of history arrive in about ninety seconds."
          }
          actions={[{ label: "Back to portfolio", href: "/portfolio" }]}
        />
      </PageGrid>
    );
  }

  const pages = Math.ceil(total / PAGE);
  const href = (p: number) =>
    `/activity?${new URLSearchParams({ ...(kind ? { kind } : {}), ...(p ? { page: String(p) } : {}) })}`;

  const rail = (
    <>
      <Card tight>
        <Stat
          eyebrow="Transactions on file"
          value={total}
          unit={kind ? `of kind ${kind}` : "all kinds"}
          tone="moss"
          tail={
            connection?.lastSyncAt
              ? `Last synced ${connection.lastSyncAt.toISOString().slice(0, 10)}, read-only.`
              : "This ledger has not been synced yet."
          }
        />
      </Card>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Filter</Eyebrow>
          <div className={styles.filters}>
            <Link
              href="/activity"
              className={styles.filter}
              data-active={!kind || undefined}
            >
              All <span className={styles.filterCount}>{kinds.reduce((s, k) => s + k.count, 0)}</span>
            </Link>
            {kinds.map((k) => (
              <Link
                key={k.kind}
                href={`/activity?kind=${k.kind}`}
                className={styles.filter}
                data-active={kind === k.kind || undefined}
              >
                {k.kind} <span className={styles.filterCount}>{k.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <PageGrid rail={rail}>
      <PageHeader
        title="Activity"
        subtitle={`${total.toLocaleString("en-US")} ${total === 1 ? "entry" : "entries"}${
          kind ? ` · ${kind}` : ""
        }${pages > 1 ? ` · page ${page + 1} of ${pages}` : ""}`}
        aside={
          <Link href="/portfolio" className={styles.back}>
            Back to portfolio
          </Link>
        }
      />

      <Card>
        <div className={styles.block}>
          <h2 className={`disp ${styles.h2}`}>Every trade and transfer</h2>
          <p className={styles.body}>
            The ledger exactly as your brokerage reported it. Read-only — Bagcheck
            can see what you did and cannot place, cancel, or modify an order.
          </p>

          {rows.length === 0 ? (
            <p className={styles.body}>No entries of that kind.</p>
          ) : (
            <div className={styles.rows}>
              {rows.map((row) => (
                <LedgerRow key={row.externalId} row={row} />
              ))}
            </div>
          )}

          {pages > 1 ? (
            <div className={styles.pager}>
              {page > 0 ? (
                <Link href={href(page - 1)} className={styles.pageLink}>
                  Newer
                </Link>
              ) : (
                <span />
              )}
              {page + 1 < pages ? (
                <Link href={href(page + 1)} className={styles.pageLink}>
                  Older
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </div>
      </Card>
    </PageGrid>
  );
}
