import styles from "./chrome.module.css";

/**
 * The pieces every dashboard page is built from.
 *
 * All server components, all presentational. They exist so that four pages
 * share one panel, one stat card and one chip rather than four near-copies
 * that drift a pixel at a time.
 */

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page} data-wash>
      {children}
    </div>
  );
}

/**
 * ── An act break ──
 *
 * The dashboard is eleven plates deep and every one of them is the same
 * near-black rectangle at the same radius with the same padding. Read end to
 * end that is eight thousand pixels of undifferentiated evidence: nothing
 * crests, nothing rests, and the eye has nowhere to land.
 *
 * The page has always had three acts and never said so — what the instrument
 * concluded, what the money did, what the year looks like — so this is a
 * hairline with a mono label sitting on it, three times down the page. It
 * costs one rule and one line of type and it is the difference between a
 * document and a list.
 *
 * Deliberately not numbered. A numbered marker is honest only where the
 * content is a sequence a reader has to keep their place in, and this is an
 * order of importance rather than a set of steps.
 */
export function Act({
  label,
  note,
  lead = false,
}: {
  label: string;
  note?: string;
  /**
   * The first act on the page.
   *
   * `:first-child` cannot be relied on for this: the Wrapped notice renders
   * above the first act when there is one, so the rule's full 78px of top
   * margin landed on top of the notice's own 34px and opened a hundred and
   * twelve pixels of nothing at the very top of the screen — the worst place
   * on the page to put a gap.
   */
  lead?: boolean;
}) {
  return (
    <div className={styles.act} data-lead={lead || undefined} data-rule>
      <span className={styles.actLabel}>{label}</span>
      {note ? <span className={styles.actNote}>{note}</span> : null}
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  voice,
  meta,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  /** Violet eyebrow: the block is the product's own reading, not a measure. */
  voice?: boolean;
  /** A quiet line opposite the headline. */
  meta?: React.ReactNode;
  /** Chips or buttons, opposite the headline. */
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.head}>
      <div>
        <div className={styles.eyebrow} data-voice={voice || undefined}>
          {eyebrow}
        </div>
        <h1 className={styles.headline}>{title}</h1>
      </div>
      {meta ? <div className={styles.headMeta}>{meta}</div> : null}
      {children}
    </div>
  );
}

/**
 * The hero figure, with its cents stepped back rather than shrunk.
 *
 * Splitting on the decimal is done here so no page has to: a figure that
 * arrives as a formatted string and gets sliced at the call site is a figure
 * that will one day be sliced in the wrong place by a locale that puts the
 * separator somewhere else.
 */
export function TotalValue({
  value,
  delta,
  deltaPct,
}: {
  value: number;
  /** Money made over the window, flows removed. Null when unknowable. */
  delta: number | null;
  deltaPct: number | null;
}) {
  const [dollars, cents] = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  })
    .format(value)
    .split(".");

  return (
    <div className={styles.total}>
      <span className={`num ${styles.totalFigure}`}>
        {dollars}
        <span className={styles.cents}>.{cents}</span>
      </span>
      {delta != null ? (
        <span
          className={`num ${styles.delta}`}
          data-tone={delta >= 0 ? "moss" : "loss"}
        >
          {delta >= 0 ? "▲" : "▼"} {money(Math.abs(delta))}
          {deltaPct != null
            ? ` · ${deltaPct >= 0 ? "+" : "−"}${Math.abs(deltaPct * 100).toFixed(2)}%`
            : ""}
        </span>
      ) : null}
    </div>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return <div className={styles.chips}>{children}</div>;
}

/** A chip is a link, not a button: a range is a place you can be sent to. */
export function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={styles.chip} data-active={active || undefined}>
      {children}
    </a>
  );
}

/**
 * The six grounds, one per band of the page.
 *
 * They are drawn once by `npm run dash:art` and used at a fraction of a card's
 * strength — a Wrapped card is a poster whose art is the subject, and a panel
 * is the opposite: the figures are the subject and anything behind them is a
 * ground or it is a problem. Each is near-black with an empty middle by brief,
 * and the panel's own fill still sits on top of it.
 *
 * A panel with no `art` is exactly the panel that shipped before this, which
 * is what keeps the mechanism from becoming something every caller has to
 * think about.
 */
export type PanelArt = "read" | "race" | "charts" | "grid" | "findings" | "set";

export function Panel({
  children,
  span,
  className,
  art,
}: {
  children: React.ReactNode;
  /** Take two of three columns in a thirds row. */
  span?: boolean;
  className?: string;
  art?: PanelArt;
}) {
  return (
    <section
      className={className ? `${styles.panel} ${className}` : styles.panel}
      data-span={span || undefined}
      data-art={art}
      data-reveal
      data-settle
    >
      {children}
    </section>
  );
}

export function PanelHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.panelHead}>
      <div>
        <div className={styles.panelEyebrow}>{eyebrow}</div>
        {title ? <h2 className={styles.panelTitle}>{title}</h2> : null}
      </div>
      {children}
    </div>
  );
}

export function PanelNote({ children }: { children: React.ReactNode }) {
  return <span className={styles.panelNote}>{children}</span>;
}

export function Stats({ children }: { children: React.ReactNode }) {
  return <div className={styles.stats}>{children}</div>;
}

export function Stat({
  label,
  value,
  tone,
  tail,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "moss" | "loss";
  tail?: React.ReactNode;
}) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={`num ${styles.statValue}`} data-tone={tone}>
        {value}
      </div>
      {tail ? <div className={styles.statTail}>{tail}</div> : null}
    </div>
  );
}

export function Row({
  kind,
  children,
}: {
  kind: "wide" | "thirds" | "halves" | "full";
  children: React.ReactNode;
}) {
  const shape =
    kind === "wide"
      ? styles.rowWide
      : kind === "thirds"
        ? styles.rowThirds
        : kind === "halves"
          ? styles.rowHalves
          : styles.rowFull;
  return <div className={`${styles.row} ${shape}`}>{children}</div>;
}

export const money = (value: number | null, digits = 0) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: digits,
      }).format(value);

export const signedMoney = (value: number | null) =>
  value == null ? "—" : `${value >= 0 ? "+" : "−"}${money(Math.abs(value))}`;

export const signedPct = (value: number | null, digits = 1) =>
  value == null ? "—" : `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}%`;
