import styles from "./Chip.module.css";

type ChipProps = {
  children: React.ReactNode;
  tone?: "gold" | "violet";
};

export function Chip({ children, tone = "gold" }: ChipProps) {
  const cls = tone === "violet" ? `${styles.chip} ${styles.violet}` : styles.chip;
  return (
    <span className={cls}>
      <i className={styles.dot} aria-hidden="true">
        ●
      </i>
      {children}
    </span>
  );
}
