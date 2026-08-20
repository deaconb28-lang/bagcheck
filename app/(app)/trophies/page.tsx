import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/auth";
import { accessFor, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { archetypeStandings, trophiesFrom, TROPHY_GROUPS } from "@/lib/trophies";
import { AppNav } from "@/components/app/AppNav";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { Paywall } from "@/components/app/Paywall";
import { shellUser } from "@/components/app/shellUser";
import { Page, PageHead } from "@/components/dash/Chrome";
import { ArchetypeSet, TrophyBand } from "@/components/dash/TrophyCase";
import styles from "./trophies.module.css";

export const metadata: Metadata = { title: "Trophies" };
export const dynamic = "force-dynamic";

/**
 * The case.
 *
 * Everything on this screen is a fact the product had already computed and
 * shown nowhere: the longest run of each kind, which of the sixteen profiles
 * the nights have read as, how many round trips the ledger holds. None of it
 * is new arithmetic — `lib/trophies.ts` reads scored days and the derived
 * document, both of which the dashboard loads anyway.
 *
 * **Locked is a state, not a gate.** Nothing here is behind a tier and nothing
 * is blurred: a trophy is either something this account's own history has done
 * or something it has not, and the only thing between the two is the history.
 * A locked tile states the one condition that earns it, and where the count is
 * a real subtraction of two things on file it states that too.
 */
export default async function TrophiesPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) redirect("/you");

  const access = await accessFor(userId);
  if (!access.allowed) return <Paywall trial={access.trial} />;

  const [data, user] = await Promise.all([loadScreen(userId, 400), shellUser()]);
  const accounts = data.connection?.accounts?.length ?? 0;
  const syncedAt = syncClock(data.connection?.lastSyncAt);

  /*
   * Nothing scored and nothing traded is not an empty case — it is an account
   * the recorder has not written a line about yet. Saying "0 of 16" over a
   * wall of grey tiles would read as a product that has decided something
   * about the reader; the honest screen says what fills it.
   */
  if (!data.scores.length && !data.derived?.roundTrips.length) {
    return (
      <>
        <AppNav active="trophies" accounts={accounts} syncedAt={syncedAt} user={user} />
        <PageGrid>
          <EmptyState
            eyebrow="Trophies"
            icon={data.connection ? "waiting" : "connect"}
            title={data.connection ? "Nothing to show yet" : "Connect a brokerage"}
            body={
              data.connection
                ? "The case fills from your own history — the first nightly score and the first closed position each put something in it."
                : "One tap via SnapTrade, read-only."
            }
            actions={[
              data.connection
                ? { label: "See your dashboard", href: "/you", ghost: true }
                : { label: "Connect a brokerage", href: "/start" },
            ]}
          />
        </PageGrid>
      </>
    );
  }

  const days = data.scores.map((score) => ({
    date: score.date,
    score: score.score,
    components: score.components,
    contributors: score.contributors,
  }));

  const trophies = trophiesFrom({
    days,
    roundTrips: data.derived?.roundTrips ?? [],
    holdings: data.holdings.length,
  });
  const standings = archetypeStandings(days);
  const earned = trophies.filter((t) => t.earned).length;

  return (
    <>
      <AppNav active="trophies" accounts={accounts} syncedAt={syncedAt} user={user} />

      <Page>
        <div data-reveal>
          <PageHead
            eyebrow="Trophies"
            title={
              <span className={styles.tally}>
                {/*
                  * The screen's one poster figure. Anton is display-only and
                  * never a sentence, so the count is set in it and the words
                  * beside it are not.
                  */}
                <span className={`poster ${styles.won}`}>{earned}</span>
                <span className={styles.of}>of {trophies.length} earned</span>
              </span>
            }
            meta="Nothing here is behind a plan. Every one is a thing your own ledger did."
          />
        </div>

        {TROPHY_GROUPS.map((group) => (
          <TrophyBand
            key={group.key}
            title={group.title}
            note={group.note}
            group={group.key}
            trophies={trophies.filter((t) => t.group === group.key)}
          />
        ))}

        <ArchetypeSet standings={standings} />

        {/*
          * The twelve frames are a set too, and they are drawn on the
          * dashboard already. A door rather than a second copy: a collection
          * rendered on two screens is a product saying one thing twice, and
          * counting it here would cost this page a whole second read of the
          * ledger to print a number the dashboard has in hand.
          */}
        <a className={styles.door} href="/wrapped">
          <span className={styles.doorEyebrow}>The set</span>
          <span className={styles.doorLine}>
            Your Wrapped frames mint from the same history. Play your year
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M13 5l7 7-7 7" />
          </svg>
        </a>
      </Page>
    </>
  );
}
