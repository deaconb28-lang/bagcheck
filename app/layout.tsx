import type { Metadata } from "next";
import { Anton, JetBrains_Mono, Playfair_Display, Public_Sans } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

// Display — figures, hero display, card titles. Never a sentence, never a
// label, never under 17px. Tracked −.008 to −.022em, tightening with size;
// the scale by size lives in globals.css.
const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-mode="light"
      className={`${display.variable} ${body.variable} ${mono.variable} ${poster.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
