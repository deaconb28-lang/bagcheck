import type { Metadata } from "next";
import { getUserId, isAuthConfigured, isDevIdentity, signOut } from "@/auth";
import { isDbConfigured, loadAppData } from "@/lib/db";
import type { ScoreDoc } from "@/lib/db";
import type { StyleBaseline } from "@/lib/score";
import { Button, Card, Eyebrow } from "@/components/primitives";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { BaselinePicker } from "./BaselinePicker";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "Bagcheck — profile" };
export const dynamic = "force-dynamic";

/** Archetype reads the strongest component — descriptive, not a grade. */
function archetypeFor(doc: ScoreDoc | null): { name: string; note: string } {
  if (!doc) {
    return { name: "Unread", note: "Not enough history to name a pattern yet." };
  }
  const entries = Object.entries(doc.components) as Array<[string, number]>;
  const [key] = entries.sort((a, b) => b[1] - a[1])[0];
  switch (key) {
    case "patience":
      return { name: "The Holder", note: "Your hold times carry the score." };
    case "consistency":
      return { name: "The Metronome", note: "Your cadence barely moves." };
    case "adherence":
      return { name: "The Rule-Keeper", note: "Contributions and rules stay intact." };
    default:
      return { name: "The Measured", note: "Your exposure stays inside your own band." };
  }
}

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export default async function ProfilePage() {
  const userId = await getUserId();

  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · profile"
          title="Nothing to show yet"
          body={
            userId
              ? "The ledger store is not configured on this deployment."
              : "Sign in to see your archetype and settings."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const { connection, scores, transactionCount } = await loadAppData(userId, 90);
  const latest = scores[0] ?? null;
  const archetype = archetypeFor(latest);
  const baseline: StyleBaseline = connection?.styleBaseline ?? latest?.baseline ?? "long-term";
  const best = scores.reduce<ScoreDoc | null>(
    (top, doc) => (!top || doc.score > top.score ? doc : top),
    null,
  );

  const rail = (
    <>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Records</Eyebrow>
          <dl className={styles.records}>
            <div className={styles.record}>
              <dt className={styles.recordKey}>Best score</dt>
              <dd className={styles.recordVal}>
                {best ? `${best.score} · ${best.date}` : "—"}
              </dd>
            </div>
            <div className={styles.record}>
              <dt className={styles.recordKey}>Days scored</dt>
              <dd className={styles.recordVal}>{scores.length}</dd>
            </div>
            <div className={styles.record}>
              <dt className={styles.recordKey}>Transactions</dt>
              <dd className={styles.recordVal}>{transactionCount}</dd>
            </div>
          </dl>
        </div>
      </Card>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Account</Eyebrow>
          <p className={styles.railBody}>
            {isDevIdentity()
              ? "Acting as a development identity — sign-in is not configured."
              : "Signed in with Google."}
          </p>
          <div className={styles.railActions}>
            <Button href="/debug" ghost>
              Raw ledger
            </Button>
            {isAuthConfigured() && !isDevIdentity() ? (
              <form action={signOutAction}>
                <Button ghost type="submit">
                  Sign out
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <PageGrid rail={rail}>
      <div className={styles.head}>
        <Eyebrow>Profile</Eyebrow>
        <h1 className={`disp ${styles.archetype}`}>{archetype.name}</h1>
        <p className={styles.body}>{archetype.note}</p>
      </div>

      <section className={styles.block}>
        <Eyebrow>Style baseline</Eyebrow>
        <p className={styles.body}>
          Your score is measured against the game you say you are playing, not
          against a model investor. Changing this rescores your history.
        </p>
        <BaselinePicker current={baseline} canSet={Boolean(connection)} />
      </section>

      <section className={styles.block}>
        <Eyebrow>Connection</Eyebrow>
        {connection ? (
          <div className={styles.connection}>
            <p className={styles.body}>
              {connection.accounts.length}{" "}
              {connection.accounts.length === 1 ? "account" : "accounts"} linked,
              read-only. Last sync{" "}
              {connection.lastSyncAt
                ? connection.lastSyncAt.toISOString().slice(0, 10)
                : "never"}
              .
            </p>
            <p className={styles.note}>
              Bagcheck can see what you did. It cannot place, cancel, or modify
              an order.
            </p>
          </div>
        ) : (
          <div className={styles.connection}>
            <p className={styles.body}>No brokerage connected yet.</p>
            <Button href="/api/snaptrade/connect">Connect a brokerage</Button>
          </div>
        )}
      </section>
    </PageGrid>
  );
}
