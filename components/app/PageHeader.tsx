import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  /** Conversational, not a label. */
  title: string;
  /** Machine facts about the screen — mono, one line, truncates. */
  subtitle?: string;
  /** Status or provenance, right-aligned on wide viewports. */
  aside?: React.ReactNode;
};

/**
 * The top area of a non-tab screen (settings, debug). Not a bar — it floats
 * on the canvas above the cards and wraps at narrow widths. Tab routes use
 * the sticky <ScreenHeader> instead; this one carries no score.
 */
export function PageHeader({ title, subtitle, aside }: PageHeaderProps) {
  return (
    <header className={styles.head}>
      <div className={styles.text}>
        <h1 className={`disp ${styles.title}`}>{title}</h1>
        {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </header>
  );
}
