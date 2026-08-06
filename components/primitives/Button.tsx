import Link from "next/link";
import styles from "./Button.module.css";

type ButtonProps = {
  children: React.ReactNode;
  ghost?: boolean;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
};

export function Button({
  children,
  ghost = false,
  href,
  onClick,
  type = "button",
}: ButtonProps) {
  const cls = ghost ? `${styles.btn} ${styles.ghost}` : styles.btn;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
