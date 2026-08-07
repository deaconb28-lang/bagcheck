import styles from "./PageGrid.module.css";

type PageGridProps = {
  children: React.ReactNode;
  /** Secondary cards. Below 900px these fold into the scroll, in order. */
  rail?: React.ReactNode;
};

/** 640px reading column with an optional right rail. Never stretches. */
export function PageGrid({ children, rail }: PageGridProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.column}>{children}</div>
      {rail ? <aside className={styles.rail}>{rail}</aside> : null}
    </div>
  );
}
