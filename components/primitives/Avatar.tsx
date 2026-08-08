import { archetypeByKey } from "@/lib/archetypes";
import { AVATAR_VIEWBOX, emblemBody } from "@/lib/avatars/drawn";
import { avatarSrc, hasGeneratedAvatar } from "@/lib/avatars/manifest";
import styles from "./Avatar.module.css";

/**
 * An archetype's mark.
 *
 * Two render paths, decided at build time by what is on disk. An archetype
 * with generated art gets the static PNG from `public/archetypes` — full
 * colour, so it cannot be a mask, and immutable, so it is cached hard.
 * Everything else renders the drawn emblem inline in `currentColor` and
 * `--moss`: on the first paint, with no request, taking the token of whatever
 * it sits in.
 *
 * There is no flag and no prop to pass down. The manifest is generated from
 * the directory, so a component asking "is there art for this?" gets the same
 * answer on the server, in the client bundle, and in a test.
 */
export function Avatar({
  archetype,
  size = 44,
}: {
  /** An archetype key from lib/archetypes.ts. */
  archetype: string;
  size?: number;
}) {
  const meta = archetypeByKey(archetype);
  if (!meta) return null;

  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
      data-tone={meta.tone}
    >
      {hasGeneratedAvatar(archetype) ? (
        // eslint-disable-next-line @next/next/no-img-element -- a static file
        // at a fixed path, sized by the caller; next/image buys nothing.
        <img
          src={avatarSrc(archetype)}
          alt=""
          width={size}
          height={size}
          className={styles.art}
        />
      ) : (
        <svg
          viewBox={AVATAR_VIEWBOX}
          width={size}
          height={size}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: emblemBody(archetype) }}
        />
      )}
    </span>
  );
}
