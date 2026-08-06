import styles from "./marketing.module.css";

export function Mark() {
  return (
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
  );
}
