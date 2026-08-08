import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadAppData } from "@/lib/db";
import { buildRoundTrips } from "@/lib/score";
import type { TxnLite } from "@/lib/score";
import { findings, whatIsMissing } from "@/lib/engine";
import { Card, Chip, Eyebrow, Stat } from "@/components/primitives";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { PageHeader } from "@/components/app/PageHeader";
import { SignInCta } from "@/components/app/SignInCta";
import { PatternsView } from "./PatternsView";

export const metadata: Metadata = { title: "Bagcheck — patterns" };
export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const userId = await getUserId();

  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · patterns"
          icon="signin"
          title="Nothing to read yet"
          body={
            userId
              ? "The ledger store is not configured on this deployment."
              : "Sign in to see what your history repeats."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const { transactions } = await getCollections();
  const [rows, { connection }] = await Promise.all([
    transactions
      .find({ userId })
      .sort({ date: 1 })
      .project<TxnLite>({ _id: 0, date: 1, type: 1, symbol: 1, units: 1, price: 1, amount: 1 })
      .toArray(),
    loadAppData(userId, 1),
  ]);

  if (!rows.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · patterns"
          icon={connection ? "sync" : "connect"}
          title={connection ? "No transactions synced" : "Connect a brokerage"}
          body={
            connection
              ? "Run a sync to pull your history. Patterns build from closed positions."
              : "One tap via SnapTrade, read-only. Years of history arrive in about ninety seconds."
          }
          actions={[{ label: "Back to portfolio", href: "/portfolio" }]}
        />
      </PageGrid>
    );
  }

  const trips = buildRoundTrips(rows);
  const found = findings(trips, rows);
  const missing = whatIsMissing(trips, rows);

  const rail = (
    <>
      <Card tight>
        <Stat
          eyebrow="Closed positions"
          value={trips.length}
          unit="read for patterns"
          tone="moss"
          tail={
            trips.length
              ? `Across ${new Set(trips.map((t) => t.symbol)).size} names in your history.`
              : "Patterns build from positions you have closed."
          }
        />
      </Card>
      <Card tight>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Eyebrow>How this works</Eyebrow>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink2)", margin: 0 }}>
            Each pattern needs at least eight closed positions on both sides
            before it will say anything. Below that it stays quiet rather than
            reporting a coincidence.
          </p>
          <Chip tone="neutral">Descriptive, never advice</Chip>
        </div>
      </Card>
    </>
  );

  return (
    <PageGrid rail={rail}>
      <PageHeader
        title="What your history repeats"
        subtitle={`${trips.length} closed positions · ${found.length} ${found.length === 1 ? "pattern" : "patterns"} clear of noise`}
      />
      <PatternsView findings={found} missing={missing} />
    </PageGrid>
  );
}
