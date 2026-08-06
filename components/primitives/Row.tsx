import styles from "./Row.module.css";

type RowProps = {
  name: string;
  /** Track fill, 0–100. */
  fill: number;
  /** Signed mono value, e.g. "+9" or "−4". */
  value: string;
  tone?: "gold" | "violet" | "clay";
};

export function Row({ name, fill, value, tone = "gold" }: RowProps) {
  const width = Math.max(0, Math.min(100, fill));
  return (
    <div className={styles.row}>
      <span className={styles.name}>{name}</span>
      <span className={styles.track}>
        <span className={styles.fill} data-tone={tone} style={{ width: `${width}%` }} />
      </span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
