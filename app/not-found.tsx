import { Button, Eyebrow } from "@/components/primitives";
import styles from "./status.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Eyebrow>Supercruise</Eyebrow>
      <h1 className={`disp ${styles.title}`}>That page does not exist</h1>
      <p className={styles.body}>
        The link may be out of date. Everything starts from Home — the score,
        your DNA, Wrapped and the ledger are all one tap from there.
      </p>
      <div className={styles.actions}>
        <Button href="/you">Go to the dashboard</Button>
        <Button href="/" ghost>
          Landing page
        </Button>
      </div>
    </main>
  );
}
