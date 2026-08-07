"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "./nav";
import styles from "./AppNav.module.css";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Left icon rail — desktop only, four routes. */
export function IconRail() {
  const isActive = useIsActive();
  return (
    <nav className={styles.rail} aria-label="Sections">
      <Link href="/" className={styles.railMark} aria-label="Bagcheck home">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="9.4"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".24"
            strokeWidth="2.6"
          />
          <path
            d="M12 2.6a9.4 9.4 0 0 1 8.1 14.1"
            fill="none"
            stroke="var(--moss)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </Link>
      <ul className={styles.railList}>
        {ROUTES.map(({ href, label, Mark }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={styles.railLink}
                data-active={active || undefined}
                aria-current={active ? "page" : undefined}
              >
                <Mark active={active} />
                <span className={styles.railTip}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bottom tab bar — below 900px, same four routes. */
export function TabBar() {
  const isActive = useIsActive();
  return (
    <nav className={styles.tabs} aria-label="Sections">
      {ROUTES.map(({ href, label, Mark }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={styles.tab}
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
          >
            <Mark active={active} />
            <span className={styles.tabLabel}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
