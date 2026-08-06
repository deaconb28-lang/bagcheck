import { Button } from "@/components/primitives";
import styles from "./marketing.module.css";

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.mark}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="9.4"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".24"
            strokeWidth="2.6"
          />
          <path
            d="M12 2.6a9.4 9.4 0 0 1 8.1 14.1"
            fill="none"
            stroke="var(--moss)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
        <span className={styles.wm}>Bagcheck</span>
      </div>
      <h1 className={styles.h1}>Fitness tracking for your portfolio</h1>
      <p className={styles.lede}>
        Connect a brokerage, get a score for how you actually invest, and find
        out in ninety seconds what your last three years say about you.
      </p>
      <div className={styles.cta}>
        <Button href="/today">Connect a brokerage</Button>
        <Button href="/scratch" ghost>
          See the primitives
        </Button>
      </div>
    </main>
  );
}
