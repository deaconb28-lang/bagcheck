import type { Metadata } from "next";
import { Button, Card, Chip, Eyebrow, Row, Stat } from "@/components/primitives";
import {
  ContributionGrid,
  DayGrid,
  DecayLine,
  Distribution,
  DotScatter,
  SegmentRing,
} from "@/components/idioms";
import type { DayState } from "@/components/idioms";
import { ModeToggle } from "./ModeToggle";
import styles from "./scratch.module.css";

export const metadata: Metadata = {
  title: "Bagcheck — scratch",
};

const S = (i: number) => Math.sin(i * 1.7) + Math.cos(i * 0.53);

const days = (n: number): DayState[] =>
  Array.from({ length: n }, (_, i) =>
    i > n - 6 ? "empty" : S(i) > 1.15 ? "exposed" : S(i) < -1.05 ? "partial" : "kept",
  );

const scatter = Array.from({ length: 60 }, (_, i) => {
  const x = ((i * 3.1) % 92) / 100;
  return { x, y: Math.abs(Math.sin(i * 2.3)), accent: x > 0.66 };
});

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
        <Eyebrow>Idioms — one per statement, legible at 200px</Eyebrow>
        <div className={styles.grid3}>
          <Card tight>
            <div className={styles.stack12}>
              <Eyebrow>Segment ring — a quarter</Eyebrow>
              <SegmentRing days={days(63)} value={82} label="Discipline" />
            </div>
          </Card>
          <Card tight>
            <div className={styles.stack12}>
              <Eyebrow>Day grid — the same, unrolled</Eyebrow>
              <DayGrid days={days(63)} from="Q3 open" to="today" />
            </div>
          </Card>
          <Card tight>
            <div className={styles.stack12}>
              <Eyebrow>Dot scatter — the gap is the insight</Eyebrow>
              <DotScatter points={scatter} divider={0.66} label="Entries by hour." />
            </div>
          </Card>
        </div>
        <div className={styles.grid3}>
          <Card tight>
            <div className={styles.stack12}>
              <Eyebrow tone="violet">Distribution — your marker</Eyebrow>
              <Distribution percentile={86} label="You are the violet mark." />
            </div>
          </Card>
          <Card tight>
            <div className={styles.stack12}>
              <Eyebrow>Decay line — over time</Eyebrow>
              <DecayLine
                series={[1, 0.94, 0.86, 0.72, 0.6, 0.44, 0.3, 0.22]}
                label="How long conviction survives a drawdown."
              />
            </div>
          </Card>
          <Card tight>
            <div className={styles.stack12}>
              <Eyebrow>Contribution grid — current cell lit</Eyebrow>
              <ContributionGrid
                days={Array.from({ length: 63 }, (_, i) => (S(i) > -0.4 ? 1 : 0))}
                label="Deposits by week."
              />
            </div>
          </Card>
        </div>
      </section>

      <section className={styles.section}>
        <Eyebrow>Button and chip</Eyebrow>
        <Card tight>
          <div className={styles.inline}>
            <Button href="/">Connect a brokerage</Button>
            <Button href="/debug" ghost>
              Open the ledger
            </Button>
            <Chip>41-day streak</Chip>
            <Chip tone="violet">Top 6% patience</Chip>
          </div>
        </Card>
      </section>
    </main>
  );
}
