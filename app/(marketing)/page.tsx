import { redirect } from "next/navigation";
import { isAuthConfigured, signIn } from "@/auth";
import { Button, Chip, Eyebrow, Row, Stat } from "@/components/primitives";
import { DayStrip } from "./DayStrip";
import { Mark } from "./Mark";
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
          <h1 className={styles.h1}>Find out how you actually invest.</h1>
          <p className={styles.lede}>
            Bagcheck reads your brokerage history and shows you the habits
            underneath it — how long you hold, what you do when things fall,
            which decisions you keep repeating. It cannot place, cancel, or
            modify an order. First report, about ninety seconds.
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

      <section className={styles.section} id="score">
        <div className={`${styles.wrap} ${styles.scoreGrid}`}>
          <div className={styles.scoreLeft}>
            <Eyebrow tone="gold">The score</Eyebrow>
            <div className={`num ${styles.scoreBig}`}>82</div>
            <p className={styles.sentence}>
              You held through three straight down weeks. That’s new for you.
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
            <div className={styles.chips}>
              <Chip>41-day streak</Chip>
              <Chip tone="violet">Top 6% patience</Chip>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.wrap} ${styles.readsIn}`}>
          <div className={styles.readsHead}>
            <Eyebrow tone="gold">What it reads</Eyebrow>
            <h2 className={`disp ${styles.h2}`}>Scored against you, not a model</h2>
          </div>
          <div className={styles.statCols}>
            <div className={styles.statCol}>
              <Stat
                eyebrow="Average hold — winners"
                value={41}
                unit="days"
                tone="gold"
                tail="Your losers: 6. You hold what’s working almost seven times longer."
              />
            </div>
            <div className={styles.statCol}>
              <Stat
                eyebrow="Sessions inside max-loss rule"
                value={58}
                unit="of 63"
                tail="The five breaks all fell in the same week in August."
              />
            </div>
            <div className={styles.statCol}>
              <Stat
                eyebrow="Patience percentile"
                value={94}
                unit="th"
                tone="violet"
                tail="Among everyone invested through the same drawdown."
              />
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
