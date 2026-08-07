import { Button, Eyebrow } from "@/components/primitives";
import styles from "./EmptyState.module.css";

type Action = { label: string; href: string; ghost?: boolean };

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  body: string;
  actions?: Action[];
  /** Rendered before the link actions — e.g. a sign-in form. */
  children?: React.ReactNode;
};

/** An empty screen is an invitation to act — and stays in ink, never clay. */
export function EmptyState({
  eyebrow,
  title,
  body,
  actions = [],
  children,
}: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
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
