import type { Metadata } from "next";
import { Button, Card, Chip, Eyebrow, Row, Stat } from "@/components/primitives";
import { ModeToggle } from "./ModeToggle";
import styles from "./scratch.module.css";

export const metadata: Metadata = {
  title: "Bagcheck — scratch",
};

export default function ScratchPage() {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <Eyebrow tone="gold">Scratch — primitives</Eyebrow>
          <h1 className={`disp ${styles.title}`}>Six primitives, both modes</h1>
        </div>
        <ModeToggle />
      </header>

      <section className={styles.section}>
        <Eyebrow>Eyebrow — three tones</Eyebrow>
        <Card tight>
          <div className={styles.stack12}>
            <Eyebrow>Q3 2026 · 63 sessions · average hold · read-only</Eyebrow>
            <Eyebrow tone="gold">Gold — discipline</Eyebrow>
            <Eyebrow tone="violet">Violet — exposure, percentile</Eyebrow>
          </div>
        </Card>
      </section>

      <section className={styles.section}>
        <Eyebrow>Stat — label, number, unit, why</Eyebrow>
        <div className={styles.grid3}>
          <Card tight>
            <Stat
              eyebrow="Average hold — winners"
              value={41}
              unit="days"
              tone="gold"
              tail="Your losers: 6. You hold what’s working almost seven times longer."
            />
          </Card>
          <Card tight>
            <Stat
              eyebrow="Sessions inside max-loss rule"
              value={58}
              unit="of 63"
              tail="The five breaks all fell in the same week in August."
            />
          </Card>
          <Card tight>
            <Stat
              eyebrow="Patience percentile"
              value={94}
              unit="th"
              tone="violet"
              tail="Among everyone invested through the same drawdown."
            />
          </Card>
        </div>
      </section>

      <section className={styles.section}>
        <Eyebrow>Card and row — hero, contributors</Eyebrow>
        <div className={styles.grid2}>
          <Card>
            <div className={styles.stack22}>
              <Eyebrow>Today</Eyebrow>
              <p className={styles.sentence}>
                You held through three straight down weeks. That’s new for you.
              </p>
              <div className={styles.scoreline}>
                <span className={`num ${styles.score}`}>82</span>
                <Eyebrow>Discipline · +3 this week</Eyebrow>
              </div>
            </div>
          </Card>
          <Card>
            <div className={styles.stack20}>
              <Eyebrow>What moved your score</Eyebrow>
              <div className={styles.rows}>
                <Row name="Held through the drawdown" fill={84} value="+9" tone="gold" />
                <Row name="Contributions on schedule" fill={62} value="+5" tone="gold" />
                <Row name="Exposure above your baseline" fill={44} value="−2" tone="violet" />
                <Row name="Sold two winners early" fill={26} value="−4" tone="clay" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className={styles.section}>
        <Eyebrow>Button and chip</Eyebrow>
        <Card tight>
          <div className={styles.inline}>
            <Button href="/">Connect a brokerage</Button>
            <Button href="/" ghost>
              See a sample report
            </Button>
            <Chip>41-day streak</Chip>
            <Chip tone="violet">Top 6% patience</Chip>
          </div>
        </Card>
      </section>
    </main>
  );
}
