import styles from "./Chip.module.css";

type ChipProps = {
  children: React.ReactNode;
  tone?: "moss" | "signal" | "accent" | "neutral";
};

const TONE = {
  moss: "",
  signal: "signal",
  accent: "accent",
  neutral: "neutral",
} as const;

export function Chip({ children, tone = "moss" }: ChipProps) {
  const variant = TONE[tone];
  const cls = variant ? `${styles.chip} ${styles[variant]}` : styles.chip;
  return (
    <span className={cls}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
