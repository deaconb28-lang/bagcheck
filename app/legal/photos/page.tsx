import type { Metadata } from "next";
import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { storedPhotos } from "@/lib/unsplash";
import styles from "../icons/credits.module.css";

export const metadata: Metadata = { title: "Bagcheck — photo credits" };
export const dynamic = "force-dynamic";

/**
 * Unsplash asks that the photographer and Unsplash are both named and both
 * linked wherever a photograph is used. The card itself is a poster with no
 * room for a byline, so the credit lives here and every link carries the
 * referral parameters their guidelines require.
 *
 * Reads the store and never calls the API — a credits page must not spend
 * quota.
 */
export default async function PhotoCreditsPage() {
  const photos = isDbConfigured() ? await storedPhotos() : {};
  const rows = Object.values(photos).sort((a, b) => a.kind.localeCompare(b.kind));

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.eyebrow}>Credits</span>
        <h1 className={`disp ${styles.title}`}>Photography</h1>
        <p className={styles.body}>
          Each Wrapped card carries one photograph behind its artwork, chosen
          once for that kind of card and worn by everyone who earns it. They
          come from Unsplash, and the photographers are named here. The shapes
          drawn over them, and every figure on a card, are ours.
        </p>

        {rows.length ? (
          <ul className={styles.list}>
            {rows.map((p) => (
              <li key={p.kind} className={styles.credit}>
                <span className={styles.name}>{p.kind}</span>
                <span className={styles.by}>
                  Photo by{" "}
                  <a href={p.creditProfileUrl} rel="noreferrer noopener" target="_blank">
                    {p.creditName}
                  </a>{" "}
                  on{" "}
                  <a href={p.creditPhotoUrl} rel="noreferrer noopener" target="_blank">
                    Unsplash
                  </a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.body}>
            No photographs have been fetched yet. The cards wear their drawn
            artwork until one is, which is a finished state rather than a gap.
          </p>
        )}

        <Link href="/" className={styles.back}>
          Back to the landing page
        </Link>
      </div>
    </main>
  );
}
