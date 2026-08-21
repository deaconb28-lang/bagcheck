import type { Metadata } from "next";
import { getUserId, isAuthConfigured, isDevIdentity, signOut } from "@/auth";
import {
  accountFootprint,
  getCollections,
  isDbConfigured,
  loadAppData,
  subscriptionFor,
  tierFor,
  syncClock,
  trialFor,
} from "@/lib/db";
import { isStripeConfigured } from "@/lib/billing";
import type { ScoreDoc } from "@/lib/db";
import { selfPercentile } from "@/lib/score";
import type { StyleBaseline } from "@/lib/score";
import { Avatar, Button, Card, Eyebrow, Stat } from "@/components/primitives";
import { archetypeFor, strongLine } from "@/lib/archetypes";
import { Distribution } from "@/components/idioms";
import { AccountData } from "@/components/app/AccountData";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { AppNav } from "@/components/app/AppNav";
import { shellUser } from "@/components/app/shellUser";
import { PageHeader } from "@/components/app/PageHeader";
import { PlanCard } from "@/components/app/PlanCard";
import { SignInCta } from "@/components/app/SignInCta";
import { trialLine } from "@/lib/tiers";
import { isEmailConfigured } from "@/lib/email/send";
import { BaselinePicker } from "./BaselinePicker";
import { EmailPrefs } from "./EmailPrefs";
import { PublicLedger } from "./PublicLedger";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

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
          eyebrow="Supercruise · profile"
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to open your profile"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : "Your archetype, plan and connection settings live here."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          {userId ? null : <SignInCta />}
        </EmptyState>
      </PageGrid>
    );
  }

  /*
   * 400, the same window the dashboard reads.
   *
   * This was 90, which meant the two screens computed a *different* personal
   * best and a different percentile off the same ledger — "best 86 on
   * 2026-05-18" in the hero and "best 85 on 2026-07-07" here, both true of
   * their own window and neither explicable to the reader looking at them.
   * One figure, one window.
   */
  const { connection, scores, transactionCount } = await loadAppData(userId, 400);
  const [tier, subscription, emailPrefs, trial, footprint] = await Promise.all([
    tierFor(userId),
    subscriptionFor(userId),
    getCollections().then((c) => c.prefs.findOne({ userId })),
    trialFor(userId),
    accountFootprint(userId),
  ]);
  const latest = scores[0] ?? null;
  const archetype = archetypeFor(latest?.components ?? null);
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
          trialLine={trialLine(trial)}
          onTrial={trial.active && !subscription?.status}
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
    <>
      {/* The nav rides every app page; settings is behind the avatar on it. */}
      <AppNav
        accounts={connection?.accounts.length ?? 0}
        syncedAt={syncClock(connection?.lastSyncAt)}
        user={await shellUser()}
      />
    <PageGrid rail={rail}>
      <PageHeader
        title="Profile"
        subtitle={`${baseline} baseline · ${connection ? `${connection.accounts.length} linked` : "no brokerage"}`}
      />

      {/*
        * The archetype is absent until all four components are measured, so
        * this block is too. A card headed "Your archetype" over a default
        * would be the product naming somebody off a ledger that proved
        * nothing about them.
        */}
      {archetype ? (
        <Card hero>
          <div className={styles.archBlock}>
            <Avatar archetype={archetype.key} size={72} />
            <div className={styles.block}>
              <Eyebrow>Your archetype</Eyebrow>
              <h2 className={`disp ${styles.archetype}`}>{archetype.name}</h2>
              <p className={styles.body}>{archetype.line}</p>
              <span className={styles.archStrong}>{strongLine(archetype)}</span>
            </div>
          </div>
        </Card>
      ) : null}

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
                Supercruise can see what you did. It cannot place, cancel, or modify
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

      {/*
        * Wrapped in a section because `Card` renders a plain div and takes no
        * `id`, and the nav's "Public" tab links to `/profile#ledger`. The bare
        * `<section id>` is the convention the marketing pages already use.
        */}
      <section id="ledger">
        <Card>
          <div className={styles.block}>
            <Eyebrow>Public ledger</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Your ledger, at an address</h2>
            <p className={styles.body}>
              A handle is short and anyone can type it, so it takes two
              deliberate steps. Weights and returns only.
            </p>
            <PublicLedger
              handle={emailPrefs?.handle ?? null}
              published={Boolean(emailPrefs?.publicLedger)}
            />
          </div>
        </Card>
      </section>

      <Card>
        <div className={styles.block}>
          <Eyebrow>Notifications</Eyebrow>
          <h2 className={`disp ${styles.h2}`}>What Supercruise sends you</h2>
          <EmailPrefs
            daily={Boolean(emailPrefs?.emailDaily)}
            weekly={Boolean(emailPrefs?.emailWeekly)}
            configured={isEmailConfigured()}
          />
        </div>
      </Card>

      {/*
        * Export and erasure. They live at the foot of settings rather than
        * behind a support address, because a product that reads someone's
        * whole brokerage history should be able to hand it back and let go
        * of it without anyone having to ask twice.
        */}
      <Card>
        <AccountData footprint={footprint} />
      </Card>
    </PageGrid>
    </>
  );
}
