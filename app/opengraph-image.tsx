import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "bagcheck — turn your portfolio into a flex";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * The unfurl for the site itself — what a link to bagcheck looks like in a
 * message, which for a product whose whole pitch is shareability is not an
 * afterthought. Twitter, iMessage, Slack and Discord all read this.
 *
 * Colours are literals for the same reason `app/og/[slug]/render.tsx` repeats
 * them: an ImageResponse renders in an isolated Satori context with no
 * stylesheet and no custom properties. These are the --mk-* marketing values.
 */
const FIELD = "#0B0B12";
const INK = "#ffffff";
const VIOLET = "#a78bfa";
const AMBER = "#F59E0B";
const DIM = "rgba(255,255,255,0.58)";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: FIELD,
          color: INK,
          padding: 76,
          fontFamily: "sans-serif",
        }}
      >
        {/* The bag mark and the wordmark, drawn the way BagcheckMark draws them. */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 34 34" fill="none">
            <path
              d="M6 12.5h22a2 2 0 0 1 2 2v11a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-11a2 2 0 0 1 2-2z"
              fill={INK}
            />
            <path
              d="M12.5 12.5v-2.2a4.5 4.5 0 0 1 9 0v2.2"
              stroke={INK}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M14.5 21.5l2.6 2.7 5-6"
              stroke={AMBER}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.035em" }}>
            bagcheck
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.22em",
              color: VIOLET,
            }}
          >
            WRAPPED FOR YOUR PORTFOLIO
          </span>
          <span
            style={{
              marginTop: 22,
              fontSize: 86,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Turn your portfolio</span>
            <span>into a flex.</span>
          </span>
        </div>

        <span style={{ fontSize: 27, color: DIM }}>
          Connect a brokerage in two taps. Get a year worth posting.
        </span>
      </div>
    ),
    size,
  );
}
