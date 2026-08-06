import { redirect } from "next/navigation";
import { isAuthConfigured, signIn } from "@/auth";
import { Button, Chip, Eyebrow, Row } from "@/components/primitives";
import { DayStrip } from "./DayStrip";
import { Mark } from "./Mark";
import { ShareCardMock } from "./ShareCardMock";
import styles from "./marketing.module.css";

async function connectAction() {
  "use server";
  if (!isAuthConfigured()) {
    redirect("/debug");
  }
  await signIn("google", { redirectTo: "/debug" });
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navIn}>
          <Mark />
          <div className={styles.navRight}>
            <nav className={styles.navLinks} aria-label="Site">
              <a className={styles.navLink} href="#how">
                How it works
              </a>
              <a className={styles.navLink} href="#score">
                The score
              </a>
              <a className={styles.navLink} href="#pricing">
                Pricing
              </a>
              <form action={connectAction}>
                <button type="submit" className={styles.navLink}>
                  Sign in
                </button>
              </form>
            </nav>
            <form action={connectAction}>
              <Button ghost type="submit">
                Connect a brokerage
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
          <DayStrip />
          <p className={styles.stripCap}>
            Sixty-three trading days — the gold ones stayed inside your rules.
          </p>
          <div className={styles.heroCtas}>
            <form action={connectAction}>
              <Button type="submit">Connect a brokerage</Button>
            </form>
            <p className={styles.ctaCaption}>
              Read-only · via SnapTrade · never a price alert
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="score">
        <div className={`${styles.wrap} ${styles.scoreGrid}`}>
          <div className={styles.scoreLeft}>
            <Eyebrow tone="gold">The score</Eyebrow>
            <div className={`num ${styles.scoreBig}`}>82</div>
            <p className={styles.sentence}>
              One number for your discipline, decomposed into what moved it.
            </p>
            <p className={styles.baseline}>
              Scored against your own baseline, not a model investor — a
              disciplined day trader and a disciplined index buyer can both
              read 95.
            </p>
          </div>
          <div className={styles.scoreRight}>
            <Eyebrow>What moved it</Eyebrow>
            <div className={styles.rows}>
              <Row name="Held through the drawdown" fill={84} value="+9" tone="gold" />
              <Row name="Contributions on schedule" fill={62} value="+5" tone="gold" />
              <Row name="Exposure above your baseline" fill={44} value="−2" tone="violet" />
              <Row name="Sold two winners early" fill={26} value="−4" tone="clay" />
            </div>
            <p className={styles.inputsLine}>
              Adherence · Consistency · Patience · Exposure
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.wrap} ${styles.readsIn}`}>
          <div className={styles.readsHead}>
            <Eyebrow tone="gold">The engine</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Patterns your P&amp;L hides</h2>
          </div>
          <div className={styles.corrCols}>
            <div className={styles.corrCol}>
              <Eyebrow>Entries by hour</Eyebrow>
              <p className={styles.corrLine}>
                Your average return is negative on positions opened after 2pm.
              </p>
            </div>
            <div className={styles.corrCol}>
              <Eyebrow>Session size</Eyebrow>
              <p className={styles.corrLine}>
                Win rate falls 20% on sessions with six or more trades.
              </p>
            </div>
            <div className={styles.corrCol}>
              <Eyebrow>Exit speed</Eyebrow>
              <p className={styles.corrLine}>
                You sell winners three times faster than losers.
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
        <div className={`${styles.wrap} ${styles.shareGrid}`}>
          <ShareCardMock />
          <div className={styles.shareCopy}>
            <Eyebrow tone="gold">Wrapped and share cards</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Proof you can post</h2>
            <p className={styles.shareLine}>
              Every card is rendered server-side and gets a URL — paste it
              anywhere and it unfurls as artwork.
            </p>
            <p className={styles.shareLine}>
              Rarity is earned, never bought. Sitting through a 20% drawdown
              mints a rare card whether you pay or not.
            </p>
            <div className={styles.segmentRow}>
              <Chip tone="violet">Top 12% — March selloff</Chip>
              <p className={styles.segmentLine}>
                Market events become segments — everyone invested through the
                same window, ranked like-for-like.
              </p>
            </div>
            <p className={styles.shareLine}>
              All of it verified by read-only brokerage data, in a category
              built on screenshots.
            </p>
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
            <Eyebrow tone="gold">Pricing</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Sharing is never paywalled</h2>
            <p className={styles.sectionLede}>
              A free user can post every achievement they earn, at full
              quality, forever. Paid tiers add formats, not permission.
            </p>
          </div>
          <div className={styles.tierCols}>
            <div className={styles.tierCol}>
              <Eyebrow>Free</Eyebrow>
              <div className={`num ${styles.tierPrice}`}>$0</div>
              <p className={styles.tierBody}>
                The score, streaks, Wrapped, and every rare card your
                behaviour earns.
              </p>
            </div>
            <div className={styles.tierCol}>
              <Eyebrow>Plus</Eyebrow>
              <div className={`num ${styles.tierPrice}`}>
                $9<span className={styles.tierUnit}>/mo</span>
              </div>
              <p className={styles.tierBody}>
                Depth for people who write — report carousels, correlation
                cards, publication-grade exports, a live score badge.
              </p>
            </div>
            <div className={styles.tierCol}>
              <Eyebrow>Trader</Eyebrow>
              <div className={`num ${styles.tierPrice}`}>
                $29<span className={styles.tierUnit}>/mo</span>
              </div>
              <p className={styles.tierBody}>
                Cadence and proof — daily session recap cards, motion exports,
                a verified public track record.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSec}>
        <div className={`${styles.wrap} ${styles.ctaIn}`}>
          <h2 className={`disp ${styles.ctaH}`}>Ninety seconds to your first report</h2>
          <form action={connectAction}>
            <Button type="submit">Connect a brokerage</Button>
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
