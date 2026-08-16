"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_ROUTES } from "./routes";
import styles from "./AppRail.module.css";

export type ShellUser = {
  name: string;
  initials: string;
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The rail. Three routes, each with its glyph and its name.
 *
 * It was 76px and icon-only, with a native `title` doing the explaining —
 * which is a tooltip nobody hovers for, on a product where the three
 * destinations are not self-evident from a drawn mark. Three items is far too
 * few to need the space back, so they say what they are.
 */
/**
 * The tab bar — below 900px, and the only navigation furniture left.
 *
 * The desktop rail is gone: 220px of column holding one tab and, a thousand
 * pixels lower, the account cluster. With a single screen there is nothing to
 * navigate between, so the mark, the avatar and the light switch moved into
 * `<ScreenHeader>` and the canvas took the width back. A phone still needs a
 * way to reach settings, which is why this survives with two tabs rather than
 * one — a one-item tab bar is a label, not navigation.
 */
export function MobileTabs() {
  const isActive = useIsActive();

  return (
    <nav className={styles.tabs} aria-label="Sections">
      {MOBILE_ROUTES.map(({ href, label, Glyph }) => (
        <Link
          key={href}
          href={href}
          className={styles.tab}
          data-active={isActive(href) || undefined}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Glyph size={20} />
          <span className={styles.tabLabel}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
