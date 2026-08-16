import Link from "next/link";
import { COMPARISON } from "./model";
import styles from "./you.module.css";

/**
 * The pieces every block on the dashboard is made of.
 *
 * All presentational, all server components. They exist because the same four
 * shapes — a figure in a hairline-ruled row, the four score components, a
 * filled link with an arrow, the two glyphs — were written out between two and
 * ten times each in one file. Ten copies of a lockup is ten places for one of
 * them to drift, and the drift is always silent.
 */

/** eyebrow → number → why. The prop order is the reading order, deliberately. */
export function Figure({
  label,
  tone,
  tail,
  children,
}: {
  label: React.ReactNode;
  /** Colour reaches a figure only when the figure has earned one. */
  tone?: "moss" | "loss" | "accent";
  tail: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.figure}>
      <span className={styles.figLabel}>{label}</span>
      <span className={`num ${styles.figValue}`} data-tone={tone}>
        {children}
      </span>
      <span className={styles.figTail}>{tail}</span>
    </div>
  );
}

/**
 * The four readings, as figures on one hairline.
 *
 * They are figures rather than meters, here and in the identity block, because
 * eight saturated bars was once the largest block of colour on this screen and
 * the number beside each is what carries the reading anyway.
 */
export function ComponentFigures({ components }: { components: Record<string, number> }) {
  return (
    <>
      {(Object.entries(components) as Array<[string, number]>).map(([name, value]) => (
        <Figure key={name} label={name} tail={COMPARISON[name] ?? ""}>
          {value}
        </Figure>
      ))}
    </>
  );
}

/** The one filled control a block is allowed, and the only one it gets. */
export function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={styles.out}>
      {children}
      <Arrow />
    </Link>
  );
}

export function Play() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2z" />
    </svg>
  );
}

export function Arrow() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h13" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}
