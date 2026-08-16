import type { Metadata } from "next";
import styles from "./flex.module.css";

/**
 * The Wrapped flow: connect, then read your year.
 *
 * Its own group rather than a page inside the app, because it is the one
 * surface a signed-out visitor is meant to reach — the landing hands off to
 * it directly, and it sits outside the launch lock the rest of the app is
 * behind. It also carries no rail: from the moment someone lands here the
 * screen belongs to the cards.
 *
 * It speaks the landing's field and the landing's face, so crossing over from
 * the marketing page reads as one product rather than two.
 */
export const metadata: Metadata = {
  title: "canopy — your Wrapped",
  description: "Connect a brokerage and get your year back as a set of cards worth posting.",
};

export default function FlexLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>{children}</div>
  );
}
