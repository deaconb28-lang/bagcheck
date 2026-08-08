import type { Metadata } from "next";
import { getUserId, isAuthConfigured, isDevIdentity, signOut } from "@/auth";
import { isDbConfigured, loadAppData, subscriptionFor, tierFor } from "@/lib/db";
import { isStripeConfigured } from "@/lib/billing";
import type { ScoreDoc } from "@/lib/db";
import { selfPercentile } from "@/lib/score";
import type { StyleBaseline } from "@/lib/score";
import { Button, Card, Eyebrow, Stat } from "@/components/primitives";
import { Distribution } from "@/components/idioms";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { PageHeader } from "@/components/app/PageHeader";
import { PlanCard } from "@/components/app/PlanCard";
import { SignInCta } from "@/components/app/SignInCta";
import { BaselinePicker } from "./BaselinePicker";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "Bagcheck — profile" };
export const dynamic = "force-dynamic";

/** Archetype reads the strongest component — descriptive, never a grade. */
function archetypeFor(doc: ScoreDoc | null): { name: string; note: string } {
  if (!doc) {
    return { name: "Unread", note: "Not enough history to name a pattern yet." };
  }
  const [key] = (Object.entries(doc.components) as Array<[string, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0];
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
  const [tier, subscription] = await Promise.all([
    tierFor(userId),
    subscriptionFor(userId),
  ]);
  const latest = scores[0] ?? null;
  const archetype = archetypeFor(latest);
  const baseline: StyleBaseline = connection?.styleBaseline ?? latest?.baseline ?? "long-term";
  const best = scores.reduce<ScoreDoc | null>(
    (top, doc) => (!top || doc.score > top.score ? doc : top),
    null,
  );
  const percentile = latest ? selfPercentile(scores, latest.score) : null;

  const renewsOn = subscription?.currentPeriodEnd
    ? subscription.currentPeriodEnd.toISOString().slice(0, 10)
    : null;

  const rail = (
    <>
      <Card tight>
        <PlanCard
          tier={tier}
          hasCustomer={Boolean(subscription?.stripeCustomerId)}
          renewsOn={renewsOn}
          cancelAtPeriodEnd={Boolean(subscription?.cancelAtPeriodEnd)}
          configured={isStripeConfigured()}
        />
      </Card>
      <Card tight>
        <Stat
          eyebrow="Days scored"
          value={scores.length}
          unit={scores.length === 1 ? "day" : "days"}
          tone="moss"
          tail={
            best
              ? `Your best reading is ${best.score}, set on ${best.date}.`
              : "Your records fill in as days are scored."
          }
        />
      </Card>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Account</Eyebrow>
          <p className={styles.railBody}>
            {isDevIdentity()
              ? "Acting as a development identity — sign-in is not configured."
              : "Signed in with Google."}
          </p>
          <p className={styles.railBody}>{transactionCount} transactions on file.</p>
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
      <PageHeader
        title="Profile"
        subtitle={`${baseline} baseline · ${connection ? `${connection.accounts.length} linked` : "no brokerage"}`}
      />

      <Card hero>
        <div className={styles.block}>
          <Eyebrow>Your archetype</Eyebrow>
          <h2 className={`disp ${styles.archetype}`}>{archetype.name}</h2>
          <p className={styles.body}>{archetype.note}</p>
        </div>
      </Card>

      {percentile != null && latest ? (
        <Card>
          <div className={styles.block}>
            <h2 className={`disp ${styles.h2}`}>Where today sits</h2>
            <Distribution
              percentile={percentile}
              label={`Today's ${latest.score} sits above ${percentile}% of your own scored days. Comparison against other people arrives with event segments.`}
            />
          </div>
        </Card>
      ) : null}

      <Card>
        <div className={styles.block}>
          <h2 className={`disp ${styles.h2}`}>The game you say you are playing</h2>
          <p className={styles.body}>
            Your score is measured against your own baseline, not against a model
            investor. Changing this rescores your history.
          </p>
          <BaselinePicker current={baseline} canSet={Boolean(connection)} />
        </div>
      </Card>

      <Card>
        <div className={styles.block}>
          <h2 className={`disp ${styles.h2}`}>Connection</h2>
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
        </div>
      </Card>
    </PageGrid>
  );
}
