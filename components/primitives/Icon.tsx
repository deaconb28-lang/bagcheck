import { iconSrc } from "@/lib/icons/names";
import type { IconName } from "@/lib/icons/names";
import styles from "./Icon.module.css";

type IconProps = {
  name: IconName;
  /** Box size in px. 16 sits in the same glyph column as the route marks. */
  size?: number;
};

/**
 * A Noun Project glyph, painted as a CSS mask rather than an <img>.
 *
 * The mask is what makes it belong here: the shape comes from the API but
 * the colour is `currentColor`, so an icon takes whatever token its row is
 * already using and no palette hex arrives from outside styles/tokens.css.
 * It also means third-party SVG is never inlined into the DOM.
 *
 * Purely presentational, and it imports from lib/icons/noun rather than the
 * barrel on purpose — the barrel reaches the database, and this file is in
 * components/primitives, which app/error.tsx pulls into a client bundle.
 * Whether icons exist at all is a question for the screen: call iconsEnabled().
 */
export function Icon({ name, size = 16 }: IconProps) {
  return (
    <span
      className={styles.icon}
      aria-hidden="true"
      style={{ "--icon": `url(${iconSrc(name)})`, "--size": `${size}px` } as React.CSSProperties}
    />
  );
}
