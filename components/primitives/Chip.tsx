import styles from "./Chip.module.css";

type ChipProps = {
  children: React.ReactNode;
  tone?: "moss" | "signal";
};

export function Chip({ children, tone = "moss" }: ChipProps) {
  const cls = tone === "signal" ? `${styles.chip} ${styles.signal}` : styles.chip;
  return (
    <span className={cls}>
      <i className={styles.dot} aria-hidden="true">
        ●
      </i>
      {children}
    </span>
  );
}
