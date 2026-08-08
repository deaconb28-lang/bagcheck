import { Button, Eyebrow, Icon } from "@/components/primitives";
import { iconsEnabled } from "@/lib/icons/names";
import type { IconName } from "@/lib/icons/names";
import styles from "./EmptyState.module.css";

type Action = { label: string; href: string; ghost?: boolean };

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  body: string;
  actions?: Action[];
  /**
   * The situation this screen is in, not the screen it is on — four of these
   * cover all twelve empty states, so the same predicament looks the same
   * wherever the reader meets it.
   */
  icon?: IconName;
  /** Rendered before the link actions — e.g. a sign-in form. */
  children?: React.ReactNode;
};

/** An empty screen is an invitation to act — and stays in ink, never clay. */
export function EmptyState({
  eyebrow,
  title,
  body,
  actions = [],
  icon,
  children,
}: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {icon && iconsEnabled() ? (
        <span className={styles.glyph}>
          <Icon name={icon} size={26} />
        </span>
      ) : null}
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className={`disp ${styles.title}`}>{title}</h1>
      <p className={styles.body}>{body}</p>
      {children || actions.length ? (
        <div className={styles.actions}>
          {children}
          {actions.map((action) => (
            <Button key={action.href} href={action.href} ghost={action.ghost}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
