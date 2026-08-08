import styles from "./field.module.css";

/**
 * The ridge — pure CSS, no image file.
 *
 * Deliberate: it renders at any size, costs nothing to load, has no CDN
 * dependency, and can be rasterized by @vercel/og, which a hot-linked image
 * cannot. That last one is the reason it is not a JPEG.
 *
 * Four stacked layers. The bright edge lives in a one-percent band — widen it
 * and the ridge goes soft and watercoloury; that narrowness is what reads as a
 * lit edge rather than a gradient. All ridges share one angle so they read as
 * a single surface seen at depth, and the fine striation keeps large flat
 * areas from banding.
 *
 * The scrims are not optional: headline contrast over the raw ridge fails AA
 * through the middle third.
 */
export function Field({ id = "grain" }: { id?: string }) {
  return (
    <div className={styles.art} aria-hidden="true">
      <div className={styles.counter} />
      <div className={styles.ridge} />
      <div className={styles.specular} />
      <div className={styles.glow} />
      <div className={styles.scrimH} />
      <div className={styles.scrimV} />
      {/* Grain is what stops the gradients looking like gradients. Overlay
          blend keeps it from lifting the blacks. */}
      <svg className={styles.grain}>
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </div>
  );
}
