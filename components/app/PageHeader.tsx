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
 * The top area. Not a bar — it floats on the canvas above the cards, and
 * wraps at narrow widths. Mono metadata here takes --ink3 rather than
 * --meta: --meta is the 4.5:1 floor on white, and the canvas is not white.
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
