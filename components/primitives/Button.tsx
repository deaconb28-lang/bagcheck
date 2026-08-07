import Link from "next/link";
import styles from "./Button.module.css";

type ButtonProps = {
  children: React.ReactNode;
  /** Secondary: outlined, transparent, fills on hover. */
  ghost?: boolean;
  /**
   * Moss-filled. Marketing surfaces and first-run moments only — inside the
   * app the primary action is ink, so the colour keeps its meaning.
   */
  marketing?: boolean;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
};

export function Button({
  children,
  ghost = false,
  marketing = false,
  href,
  onClick,
  type = "button",
}: ButtonProps) {
  const cls = [styles.btn, ghost ? styles.ghost : "", marketing ? styles.marketing : ""]
    .filter(Boolean)
    .join(" ");
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
