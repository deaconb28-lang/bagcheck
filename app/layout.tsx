import type { Metadata } from "next";
import { Bricolage_Grotesque, Martian_Mono, Public_Sans } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

// Display: engineered numerals with optical-size and width axes.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-display",
  display: "swap",
});

// Body: quiet, legible, and deliberately not the default UI grotesque.
const body = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Labels: a monospace built for UI, which is what makes the eyebrows read
// like instrument markings rather than code.
const mono = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
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
      data-mode="dark"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
