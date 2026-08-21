import { redirect } from "next/navigation";
import { appLocked } from "@/lib/launch";
import styles from "./app.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Locked until launch: the app group exists but the doors are shut. The
  // landing carries the story. Open by default; APP_LOCKED=1 shuts it.
  if (appLocked()) redirect("/");

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
