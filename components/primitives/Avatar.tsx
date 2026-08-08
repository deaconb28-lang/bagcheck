import { archetypeByKey } from "@/lib/archetypes";
import { AVATAR_VIEWBOX, emblemBody } from "@/lib/avatars/drawn";
import styles from "./Avatar.module.css";

/**
 * An archetype's mark.
 *
 * Two render paths, chosen server-side and never at runtime. With image
 * generation configured the avatar is the stored PNG from `/api/avatar/[key]`
 * — full-colour art, so it cannot be a mask. Without it, the emblem is drawn
 * inline in `currentColor` and `--moss`, which means it is on the first paint
 * with no request and takes the token of whatever it sits in.
 *
 * `art` is a prop rather than a read, for the same reason `<PricingTiers
 * glyphs>` takes one: the key is not `NEXT_PUBLIC`, so a client component
 * asking would always be told no.
 */
export function Avatar({
  archetype,
  size = 44,
  art = false,
}: {
  /** An archetype key from lib/archetypes.ts. */
  archetype: string;
  size?: number;
  /** Whether generated art exists on this deployment — `avatarsEnabled()`. */
  art?: boolean;
}) {
  const meta = archetypeByKey(archetype);
  if (!meta) return null;

  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
      data-tone={meta.tone}
    >
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element -- a generated
        // PNG at a fixed URL, sized by the caller; next/image buys nothing.
        <img
          src={`/api/avatar/${archetype}`}
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
