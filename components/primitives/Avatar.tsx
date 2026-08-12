import { archetypeByKey } from "@/lib/archetypes";
import { AVATAR_VIEWBOX, avatarFamily, emblemBody } from "@/lib/avatars/drawn";
import { avatarSrc, hasGeneratedAvatar } from "@/lib/avatars/manifest";
import styles from "./Avatar.module.css";

/**
 * An archetype's mark.
 *
 * Two render paths, decided at build time by what is on disk. The drawn
 * character is the one that ships: inline SVG, on the first paint, with no
 * request, coloured by the family the archetype earned. An archetype with a
 * generated PNG in `public/archetypes` uses that instead — full colour, so it
 * cannot be a mask, and immutable, so it is cached hard.
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
      data-family={avatarFamily(meta)}
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
