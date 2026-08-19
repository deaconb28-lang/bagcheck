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
  shape = "tile",
  tone = "card",
}: {
  /** An archetype key from lib/archetypes.ts. */
  archetype: string;
  /**
   * A number of pixels, or any CSS length — including a custom property, so a
   * surface can resize the character in a media query. The drawing is a
   * viewBox, so it costs nothing either way; what needs a real length is the
   * plate, and that is this element.
   */
  size?: number | string;
  /**
   * The plate the character sits on.
   *
   * `tile` is the squircle it wears in a row or beside a name. `circle` is
   * for the one place the character sits *inside* something already round —
   * the score ring — where a rounded square inside a circle reads as two
   * frames arguing.
   *
   * There is no "no plate" option, and that is deliberate: the drawing is
   * coloured entirely by `--av-lit`/`--av-mid`/`--av-deep`, which this
   * wrapper is what sets. Render the SVG outside it and all three resolve to
   * nothing and the character draws invisible.
   */
  shape?: "tile" | "circle";
  /**
   * Which palette the character is drawn in.
   *
   * `card` is the four `--card-*` families — the archetype's own colour, worn
   * on the surface that has its own palette. `ink` is the app's ramp, and it
   * is what every in-app surface passes: the screen is black and white, and a
   * saturated character at the head of it is the loudest thing on a page with
   * no other hue. The identity survives the change because the identity is
   * the *drawing* — sixteen different characters, not four colours.
   */
  tone?: "card" | "ink";
}) {
  const meta = archetypeByKey(archetype);
  if (!meta) return null;

  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        borderRadius:
          shape === "circle"
            ? "50%"
            : typeof size === "number"
              ? Math.round(size * 0.28)
              : "28%",
      }}
      data-tone={meta.tone}
      data-family={avatarFamily(meta)}
      data-paint={tone}
    >
      {hasGeneratedAvatar(archetype) ? (
        // A static file at a fixed path, sized by the caller; next/image
        // buys nothing here.
        <img
          src={avatarSrc(archetype)}
          alt=""
          className={styles.art}
        />
      ) : (
        <svg
          viewBox={AVATAR_VIEWBOX}
          width="100%"
          height="100%"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: emblemBody(archetype) }}
        />
      )}
    </span>
  );
}
