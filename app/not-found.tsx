import { Button, Eyebrow } from "@/components/primitives";
import styles from "./status.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Eyebrow>Bagcheck</Eyebrow>
      <h1 className={`disp ${styles.title}`}>That page does not exist</h1>
      <p className={styles.body}>
        The link may be out of date. Today, Portfolio, Reports, and Profile are
        the four screens.
      </p>
      <div className={styles.actions}>
        <Button href="/today">Go to Today</Button>
        <Button href="/" ghost>
          Landing page
        </Button>
      </div>
    </main>
  );
}
