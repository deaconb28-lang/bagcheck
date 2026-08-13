import type { Metadata, Viewport } from "next";
import { Anton, JetBrains_Mono, Playfair_Display, Public_Sans, Space_Grotesk } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

/*
 * Display — figures, headings, hero numbers. A geometric grotesque with
 * enough personality to carry a 96px score and enough restraint to sit in a
 * header. This is the voice of the instrument; the serif that used to hold
 * this job read as a financial newspaper, which is the opposite of a product
 * people screenshot.
 */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/*
 * Serif — share cards only. On a card it is a *voice* (the stamp and
 * editorial templates), one of four; in the app it is retired. Enforced by
 * scope: the variable is only read inside components/cards and app/c.
 */
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-serif",
  display: "swap",
});

// UI and body — every sentence, label, button, input.
const body = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Labels, eyebrows, timestamps, counts, comparatives. Never body copy,
// never headings. The moment a metric label renders in the body face the
// system starts to smear.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

/*
 * Poster face — share cards only, and nowhere else in the product.
 *
 * The three-family rule is about the *app*, where a fourth face is how a
 * system starts to smear. A share card is not in the app: it is minted to
 * leave, and it competes in a feed against everything else in that feed. A
 * high-contrast serif set at 58px loses that fight; a condensed grotesque at
 * 120px does not.
 *
 * Enforced by scope rather than by discipline — the variable is only read
 * inside components/cards and app/og.
 */
const poster = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-poster",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bagcheck",
  description: "Fitness tracking for your investment portfolio.",
};

/*
 * `viewportFit: "cover"` is load-bearing on phones: without it,
 * env(safe-area-inset-bottom) resolves to zero and the bottom tab bar sits
 * under the iPhone home indicator. The theme colour matches the light field,
 * which is the base mode.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f4f6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-mode="light"
      className={`${display.variable} ${serif.variable} ${body.variable} ${mono.variable} ${poster.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
