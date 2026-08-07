import { Button, Eyebrow } from "@/components/primitives";
import styles from "./Placeholder.module.css";

type PlaceholderProps = {
  name: string;
  milestone: string;
  /** What this screen will show once the milestone lands. */
  summary: string;
};

export function Placeholder({ name, milestone, summary }: PlaceholderProps) {
  return (
    <main className={styles.page}>
      <Eyebrow>Bagcheck · {milestone}</Eyebrow>
      <h1 className={`disp ${styles.h}`}>{name}</h1>
      <p className={styles.p}>{summary}</p>
      <div className={styles.actions}>
        <Button href="/today">Today</Button>
        <Button href="/debug" ghost>
          Raw ledger
        </Button>
      </div>
    </main>
  );
}
