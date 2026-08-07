import styles from "./Card.module.css";

type CardProps = {
  children: React.ReactNode;
  /** Compact padding, for nested and rail cards. */
  tight?: boolean;
  /** A hero panel — larger radius and a half step more lift. */
  hero?: boolean;
  /** A nested panel: sunken field, no lift. */
  sunken?: boolean;
  className?: string;
};

export function Card({
  children,
  tight = false,
  hero = false,
  sunken = false,
  className,
}: CardProps) {
  const cls = [
    styles.card,
    tight ? styles.tight : "",
    hero ? styles.hero : "",
    sunken ? styles.sunken : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}
