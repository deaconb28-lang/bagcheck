import { redirect } from "next/navigation";
import { getUserId } from "@/auth";
import { appLocked } from "@/lib/launch";
import styles from "./app.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Locked until launch: the app group exists but the doors are shut. The
  // landing carries the story. Open by default; APP_LOCKED=1 shuts it.
  if (appLocked()) redirect("/");

  /*
   * No session, no app — go to the landing.
   *
   * Every screen in this group used to answer a signed-out visitor with its
   * own empty state: a title, a sentence and two buttons on the black field,
   * with no nav and so no way back to anything. That is a dead end rather
   * than a screen, and it was the *first* thing the product showed anybody
   * arriving from a saved home-screen icon — an app that opens on "Sign in to
   * see your dashboard" has told a stranger nothing about what they opened.
   *
   * The landing already handles exactly this reader better than any of those
   * empty states did: it explains the product, and its one button *is* the
   * sign-in, which comes back at the dashboard rather than at whichever
   * screen they happened to knock on.
   *
   * It sits in the layout so it is one rule for fifteen routes instead of
   * fifteen chances to forget. The pages keep their own checks — a layout is
   * not re-executed on a client-side navigation, so a session that expires
   * mid-visit is still caught by the page — but those branches now only ever
   * render for the reasons that are not "signed out", such as a deployment
   * with no store configured.
   */
  if (!(await getUserId())) redirect("/");

  return (
    <div className={styles.shell} data-surface>
      {/*
        The field — the same ridge the landing page runs, drawn in CSS rather
        than loaded as an image. It renders at any size, costs nothing, has no
        CDN dependency, and can be rasterised by @vercel/og, which a JPEG
        cannot. In-product it is suppressed hard: this is an instrument, and
        the artwork is a gesture rather than a subject.
      */}
      <div className={styles.field} aria-hidden="true">
        <div className={styles.fieldRidge} />
        <div className={styles.fieldFade} />
      </div>

      <div className={styles.canvas}>{children}</div>
    </div>
  );
}
