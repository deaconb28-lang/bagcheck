import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "supercruise — a flight recorder for your portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * The unfurl for the site itself — what a link to supercruise looks like in a
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
        {/*
          * The dart mark and the wordmark, drawn the way `SupercruiseMark`
          * draws them. This was still the *bag* mark — two brands ago — while
          * the app had been through a level and is now on a dart; an unfurl is
          * the one surface nobody looks at from inside the product, which is
          * exactly how a logo goes three renames stale without anyone noticing.
          */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 34 34" fill="none">
            <circle
              cx="17"
              cy="17"
              r="13"
              fill="none"
              pathLength="100"
              stroke={INK}
              strokeWidth="2"
              strokeDasharray="37 13 37 13"
              strokeDashoffset="6"
            />
            <path d="M28 5.6 L9.6 16.8 L16.7 19.2 L17.3 26.4 Z" fill={INK} />
            <path
              d="M13.4 22.8 L7.2 29"
              stroke={INK}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M8.4 18.8 L3 24.2"
              stroke={INK}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.035em" }}>
            supercruise
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
            <span>A flight recorder</span>
            <span>for your portfolio.</span>
          </span>
        </div>

        <span style={{ fontSize: 27, color: DIM }}>
          Connect a brokerage in two taps. It records; it never flies.
        </span>
      </div>
    ),
    size,
  );
}
