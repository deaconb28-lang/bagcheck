import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display, Public_Sans } from "next/font/google";
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
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
