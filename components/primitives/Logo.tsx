import { logoSrc, normalizeSymbol } from "@/lib/logos";
import styles from "./Logo.module.css";

type LogoProps = {
  symbol: string | null | undefined;
  /** Rendered tile edge in px. The proxy snaps to its nearest render size. */
  size?: number;
};

/**
 * A company mark beside its ticker — the handoff's platform tile, holding a
 * logo instead of a glyph.
 *
 * Rows without an instrument (transfers, dividends on cash) get nothing
 * rather than an empty box. The proxy always returns an image, so there is no
 * broken-image state and no fallback flash to design around.
 */
export function Logo({ symbol, size = 28 }: LogoProps) {
  const ticker = normalizeSymbol(symbol);
  if (!ticker) return null;
  return (
    <img
      className={styles.logo}
      src={logoSrc(ticker, size * 2)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      loading="lazy"
      decoding="async"
    />
  );
}
