import { redirect } from "next/navigation";
import { getUserId, isAuthConfigured, signIn } from "@/auth";
import { Button, Chip, Eyebrow } from "@/components/primitives";
import { DayStrip } from "./DayStrip";
import { ConvictionBars, DistributionWide, MiniScatter, WinRateBars } from "./Idioms";
import { Mark } from "./Mark";
import { TodayMock } from "./TodayMock";
import { WrappedFan } from "./WrappedFan";
import styles from "./marketing.module.css";

/**
 * The single CTA path: already signed in goes straight to the ledger,
 * otherwise Google sign-in lands there. Without auth configured it falls
 * back to /debug, which explains what is missing.
 */
async function connectAction() {
  "use server";
  if (!isAuthConfigured()) {
    redirect("/debug");
  }
  if (await getUserId()) {
    redirect("/today");
  }
  await signIn("google", { redirectTo: "/today" });
}

// The CTA label depends on the session, so this page is never prerendered.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const signedIn = Boolean(await getUserId());

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navIn}>
          <Mark />
          <div className={styles.navRight}>
            <nav className={styles.navLinks} aria-label="Site">
              <a className={styles.navLink} href="#score">
                The score
              </a>
              <a className={styles.navLink} href="#wrapped">
                Wrapped
              </a>
              <a className={styles.navLink} href="#pricing">
                Pricing
              </a>
              <form action={connectAction}>
                <button type="submit" className={styles.navLink}>
                  {signedIn ? "Your ledger" : "Sign in"}
                </button>
              </form>
            </nav>
            <form action={connectAction}>
              <Button ghost type="submit">
                {signedIn ? "Open Bagcheck" : "Connect a brokerage"}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroIn}>
          <h1 className={styles.h1}>Transform how you trade.</h1>
          <p className={styles.lede}>
            It starts with seeing what you actually do. Bagcheck reads your
            brokerage history — read-only, permanently — and scores the part
            you control: hold time, sizing, drawdown behaviour, consistency.
            First report in about ninety seconds.
          </p>
          <div className={styles.heroCtas}>
            <form action={connectAction}>
              <Button marketing type="submit">
                {signedIn ? "Open your ledger" : "Connect a brokerage"}
              </Button>
            </form>
            <p className={styles.ctaCaption}>
              Read-only · via SnapTrade · never a price alert
            </p>
          </div>
        </div>

        {/* The quarter itself, spanning the page. */}
        <div className={styles.waveBlock}>
          <DayStrip />
          <p className={styles.stripCap}>
            Sixty-three trading days of P&amp;L, straight from your brokerage.
            Bagcheck reads all of it and scores none of it — the score is what
            you did on each of these days.
          </p>
        </div>
      </section>

      <section className={styles.section} id="score">
        <div className={`${styles.wrap} ${styles.scoreIn}`}>
          <div className={styles.readsHead}>
            <Eyebrow tone="moss">The score</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>One number, decomposed</h2>
            <p className={styles.sectionLede}>
              Every morning opens on a sentence about your behaviour, the
              Discipline score, and exactly what moved it — green where you
              held the line, blue where exposure ran, clay where it cost you.
            </p>
          </div>

          <div className={styles.scoreGrid}>
            <TodayMock />
            <div className={styles.scoreCopy}>
              <p className={styles.scoreClaim}>
                Scored against your own baseline, not a model investor.
              </p>
              <p className={styles.baseline}>
                A day trader taking twelve trades a day is at baseline, not
                penalised — they are scored on whether they run their own game
                consistently. A disciplined day trader and a disciplined index
                buyer can both read 95.
              </p>
              <p className={styles.baseline}>
                It moves slowly by design. If you could spike it in a day, the
                number would be wrong: the failure mode is someone trading to
                raise their score.
              </p>
            </div>
          </div>

          <div className={styles.inputCols}>
            <div className={styles.inputCol}>
              <Eyebrow>Adherence</Eyebrow>
              <p className={styles.tierBody}>
                Did you follow the rules you set for yourself.
              </p>
            </div>
            <div className={styles.inputCol}>
              <Eyebrow>Consistency</Eyebrow>
              <p className={styles.tierBody}>
                Sizing, cadence and hold times against your own baseline.
              </p>
            </div>
            <div className={styles.inputCol}>
              <Eyebrow>Patience</Eyebrow>
              <p className={styles.tierBody}>
                What you do in a drawdown, and how fast you sell winners.
              </p>
            </div>
            <div className={styles.inputCol}>
              <Eyebrow>Exposure</Eyebrow>
              <p className={styles.tierBody}>
                Speculative weight and trade count against the game you said
                you were playing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.wrap} ${styles.readsIn}`}>
          <div className={styles.readsHead}>
            <Eyebrow tone="moss">The engine</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Patterns your P&amp;L hides</h2>
          </div>
          <div className={styles.corrCols}>
            <div className={styles.corrCol}>
              <Eyebrow>Entries by hour</Eyebrow>
              <MiniScatter />
              <p className={styles.corrLine}>
                Your average return is negative on positions opened after 2pm.
              </p>
            </div>
            <div className={styles.corrCol}>
              <Eyebrow>Trades per session</Eyebrow>
              <WinRateBars />
              <p className={styles.corrLine}>
                Win rate falls 20% on sessions with six or more trades.
              </p>
            </div>
            <div className={styles.corrCol}>
              <Eyebrow>Conviction tags</Eyebrow>
              <ConvictionBars />
              <p className={styles.corrLine}>
                Conviction-5 positions returned 4× your conviction-2 positions.
              </p>
            </div>
          </div>
          <p className={styles.corrCap}>
            Built from your history plus two taps at entry — why, and
            conviction 1–5. None of it works on day one; it compounds with
            months of your own data.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.wrap} ${styles.segGrid}`}>
          <div className={styles.segCopy}>
            <Eyebrow tone="signal">Segments</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Every selloff becomes a leaderboard</h2>
            <p className={styles.sectionLede}>
              Market events turn into shared windows — everyone invested
              through the same drawdown, scored on how they handled it,
              like-for-like.
            </p>
            <Chip tone="signal">Top 12% — March selloff</Chip>
            <p className={styles.baseline}>
              A new segment mints itself with every notable market event. You
              are the blue mark.
            </p>
          </div>
          <div className={styles.segViz}>
            <DistributionWide />
            <p className={styles.stripCap}>
              Everyone invested through the same window — patience percentile.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="wrapped">
        <div className={`${styles.wrap} ${styles.wrappedIn}`}>
          <div className={styles.wrappedHead}>
            <Eyebrow tone="moss">Wrapped and share cards</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Proof you can post</h2>
            <p className={styles.sectionLede}>
              Every card is a URL. Paste it into a message and it unfurls as
              artwork; the click lands on a public page with your numbers on
              it. Because your history arrives in full, the first set renders
              the day you connect.
            </p>
          </div>
          <WrappedFan />
          <div className={styles.wrappedPoints}>
            <div className={styles.wrappedPoint}>
              <Eyebrow>Rendered server-side</Eyebrow>
              <p className={styles.tierBody}>
                The card is an image at a URL, not a screenshot you crop. It
                looks the same in every client that opens it.
              </p>
            </div>
            <div className={styles.wrappedPoint}>
              <Eyebrow>Rarity is behaviour</Eyebrow>
              <p className={styles.tierBody}>
                Sitting through a 20% drawdown mints a rare card on the free
                tier. Paying unlocks new formats, never scarce ones.
              </p>
            </div>
            <div className={styles.wrappedPoint}>
              <Eyebrow>The strip is the receipt</Eyebrow>
              <p className={styles.tierBody}>
                Every card carries the days behind its number, read from your
                brokerage — in a category that runs on unverifiable claims.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="how">
        <div className={styles.wrap}>
          <div className={styles.stepRow}>
            <span className={styles.stepNum}>01</span>
            <span className={`disp ${styles.stepTitle}`}>Connect</span>
            <p className={styles.stepBody}>
              One tap via SnapTrade. Read-only, permanently — no manual entry,
              no screenshots, no CSV.
            </p>
          </div>
          <div className={styles.stepRow}>
            <span className={styles.stepNum}>02</span>
            <span className={`disp ${styles.stepTitle}`}>It arrives full</span>
            <p className={styles.stepBody}>
              Years of history parsed in about ninety seconds. The first thing
              you see is your own annual retrospective.
            </p>
          </div>
          <div className={styles.stepRow}>
            <span className={styles.stepNum}>03</span>
            <span className={`disp ${styles.stepTitle}`}>The quiet one</span>
            <p className={styles.stepBody}>
              One calm notification a day, never a price alert. The most
              valuable message: nothing to do today, you’re on plan.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="pricing">
        <div className={`${styles.wrap} ${styles.readsIn}`}>
          <div className={styles.readsHead}>
            <Eyebrow tone="moss">Pricing</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Sharing is never paywalled</h2>
            <p className={styles.sectionLede}>
              A free user can post every achievement they earn, at full
              quality, forever. Paid tiers add formats, not permission — and
              no tier sells you a rare card.
            </p>
          </div>
          <div className={styles.tierCols}>
            <div className={styles.tierCol}>
              <div className={styles.tierHead}>
                <Eyebrow>Free</Eyebrow>
                <div className={`num ${styles.tierPrice}`}>$0</div>
                <p className={styles.tierWho}>Anyone with a brokerage</p>
              </div>
              <ul className={styles.tierList}>
                <li>The Discipline score and what moved it</li>
                <li>Streaks, Wrapped, and event segments</li>
                <li>Every rare card your behaviour earns</li>
              </ul>
            </div>
            <div className={styles.tierCol}>
              <div className={styles.tierHead}>
                <Eyebrow>Plus</Eyebrow>
                <div className={`num ${styles.tierPrice}`}>
                  $9<span className={styles.tierUnit}>/mo</span>
                </div>
                <p className={styles.tierWho}>People who write about investing</p>
              </div>
              <ul className={styles.tierList}>
                <li>Report carousels and correlation cards</li>
                <li>Publication-grade exports and embeds</li>
                <li>A live score badge for your site</li>
              </ul>
            </div>
            <div className={styles.tierCol}>
              <div className={styles.tierHead}>
                <Eyebrow>Trader</Eyebrow>
                <div className={`num ${styles.tierPrice}`}>
                  $29<span className={styles.tierUnit}>/mo</span>
                </div>
                <p className={styles.tierWho}>Active day and swing traders</p>
              </div>
              <ul className={styles.tierList}>
                <li>Daily session recap cards</li>
                <li>Motion exports for video</li>
                <li>A verified public track record</li>
              </ul>
            </div>
          </div>
          <p className={styles.tierFoot}>
            Rarity is earned by conduct at every tier. Sitting through a 20%
            drawdown mints the same rare card whether you pay or not.
          </p>
        </div>
      </section>

      <section className={styles.ctaSec}>
        <div className={`${styles.wrap} ${styles.ctaIn}`}>
          <h2 className={`disp ${styles.ctaH}`}>Ninety seconds to your first report</h2>
          <form action={connectAction}>
            <Button marketing type="submit">
              {signedIn ? "Open your ledger" : "Connect a brokerage"}
            </Button>
          </form>
          <p className={styles.ctaTrust}>Read-only, permanently · never a price alert</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerIn}`}>
          <Mark />
          <a className="eyebrow" href="/scratch">
            Primitives
          </a>
        </div>
      </footer>
    </div>
  );
}
