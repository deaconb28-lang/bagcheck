import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/auth";
import { accessFor, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { archetypeStandings, nextUp, trophiesFrom, TROPHY_GROUPS } from "@/lib/trophies";
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
                ? "It fills itself. Your first scored night and your first closed position each put something in here."
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
  /* What the account is closest to, so the case has a front as well as a back. */
  const next = nextUp(trophies);

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
            meta="None of it is behind a plan. Every one is something your ledger actually did."
          />
        </div>

        {/*
          * ── What is next ──
          *
          * A case with nothing but a tally at the top is a list of things you
          * have and a list of things you do not, and no reason to come back.
          * These three are the closest to earning, ranked by a real
          * subtraction — days on file against the bar, positions held against
          * the bar — never by what would read best.
          */}
        {next.length ? (
          <section className={styles.next} data-reveal>
            <p className={styles.nextHead}>Closest to earning</p>
            <ul className={styles.nextList}>
              {next.map((trophy) => (
                <li key={trophy.key} className={styles.nextRow}>
                  <span className={styles.nextName}>{trophy.name}</span>
                  <span className={styles.nextNeed}>{trophy.requires}</span>
                  {trophy.progress ? (
                    <span className={styles.nextMeter}>
                      <span
                        className={styles.nextFill}
                        style={{
                          transform: `scaleX(${trophy.progress.have / trophy.progress.need})`,
                        }}
                      />
                      <span className={`num ${styles.nextCount}`}>
                        {trophy.progress.have} / {trophy.progress.need}
                      </span>
                    </span>
                  ) : (
                    /*
                      * A single-event trophy has no pair, and it does not get
                      * the meter column's class either — `.nextCount` is
                      * placed at `grid-column: 2` *inside* the meter's own
                      * grid, so used directly on the row it landed in the
                      * row's second column and pushed the condition into the
                      * third.
                      */
                    <span className={styles.nextSingle}>Not yet</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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
            Same history, twelve posters. Play your year
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
