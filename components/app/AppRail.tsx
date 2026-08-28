"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_ROUTES, ROUTES, MarkGlyph } from "./routes";
import { ModeSwitch } from "./ModeSwitch";
import styles from "./AppRail.module.css";

export type ShellUser = {
  name: string;
  initials: string;
};

/**
 * The rail — icon only, six destinations.
 *
 * It was removed when this product had one screen, on the reasoning that a
 * rail with nothing to navigate between is chrome asking to be read. There
 * are six screens now, and at six a horizontal tab row spends the top of
 * every page on words the reader learns once and then never reads again.
 *
 * Icon-only is the point rather than a saving. Whoop and Oura both put the
 * navigation at an edge and give the whole remaining frame to one reading;
 * this is the same trade with the frame turned ninety degrees. What makes it
 * work is that the glyphs are drawn here rather than fetched, so they are on
 * the first paint and take `currentColor` — and every one carries a real
 * label for a screen reader and a tooltip for a pointer, so the mark is a
 * shortcut for people who know the product and never the only way to know it.
 */
function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function AppRail() {
  const isActive = useIsActive();

  return (
    <nav className={styles.rail} aria-label="Sections">
      <Link href="/you" className={styles.mark} aria-label="supercruise">
        <MarkGlyph size={22} />
      </Link>

      <ul className={styles.list}>
        {ROUTES.map((route) => {
          const active = isActive(route.href);
          return (
            <li key={route.href}>
              <Link
                href={route.href}
                className={styles.item}
                aria-current={active ? "page" : undefined}
                title={route.label}
              >
                <route.Glyph size={20} />
                <span className={styles.sr}>{route.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* The foot. One control, and it is the only thing here that is not a
          destination — which is why it sits apart rather than as a seventh
          item in the list. */}
      <div className={styles.foot}>
        <ModeSwitch />
      </div>
    </nav>
  );
}

/**
 * The tab bar, below 900px.
 *
 * The rail is gone at that width and a phone still has to reach every
 * section, so the same six run across the foot at 44px each — the floor for
 * a target nobody mis-taps, and the shape both reference apps use.
 */
export function MobileTabs() {
  const isActive = useIsActive();

  return (
    <nav className={styles.tabs} aria-label="Sections">
      {MOBILE_ROUTES.map((route) => {
        const active = isActive(route.href);
        return (
          <Link
            key={route.href}
            href={route.href}
            className={styles.tab}
            aria-current={active ? "page" : undefined}
          >
            <route.Glyph size={19} />
            <span className={styles.tabLabel}>{route.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
