import styles from "./Card.module.css";

type CardProps = {
  children: React.ReactNode;
  tight?: boolean;
  className?: string;
};

export function Card({ children, tight = false, className }: CardProps) {
  const cls = [styles.card, tight ? styles.tight : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}
