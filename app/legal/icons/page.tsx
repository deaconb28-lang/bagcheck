import type { Metadata } from "next";
import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { iconsEnabled, storedIcons } from "@/lib/icons";
import styles from "./credits.module.css";

export const metadata: Metadata = { title: "Bagcheck — icon credits" };
export const dynamic = "force-dynamic";

/**
 * Noun Project icons are CC-BY unless they are public domain, so the people
 * who drew them are named. This reads the stored icons and never calls the
 * API — a credits page must not spend quota.
 */
export default async function IconCreditsPage() {
  const icons = isDbConfigured() && iconsEnabled() ? await storedIcons() : [];

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.eyebrow}>Credits</span>
        <h1 className={`disp ${styles.title}`}>Icons</h1>
        <p className={styles.body}>
          The glyphs in Bagcheck come from The Noun Project, under the Creative
          Commons attribution licence. The people who drew them are listed here.
          The route marks in the sidebar are drawn by us and are not on this list.
        </p>

        {icons.length ? (
          <ul className={styles.list}>
            {icons.map((icon) => (
              <li key={icon.name} className={styles.credit}>
                <span className={styles.name}>{icon.name}</span>
                <span className={styles.by}>{icon.credit}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.body}>
            No icons have been fetched yet. They arrive the first time a screen
            asks for one.
          </p>
        )}

        <Link href="/" className={styles.back}>
          Back to the landing page
        </Link>
      </div>
    </main>
  );
}
