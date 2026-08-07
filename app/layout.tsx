import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit, Public_Sans } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

// Display — headings, score numerals, the wordmark. Always negatively
// tracked; the tracking scale by size lives in globals.css.
const display = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// UI and body — every sentence, label, button, input.
const body = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Machine facts only: timestamps, counts, metadata, caps micro-labels.
// Never body copy, never headings.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
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
