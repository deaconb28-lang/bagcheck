import { Eyebrow } from "@/components/primitives";
import styles from "./Placeholder.module.css";

type PlaceholderProps = {
  name: string;
  milestone: string;
};

export function Placeholder({ name, milestone }: PlaceholderProps) {
  return (
    <main className={styles.page}>
      <Eyebrow>Bagcheck · scaffold</Eyebrow>
      <h1 className={`disp ${styles.h}`}>{name}</h1>
      <p className={styles.p}>
        This screen arrives with {milestone}. The primitives live at /scratch.
      </p>
    </main>
  );
}
