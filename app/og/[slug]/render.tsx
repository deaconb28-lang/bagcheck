import { ImageResponse } from "next/og";
import { fetchLogoPng, monogram, normalizeSymbol, TILE, toneIndex } from "@/lib/logos";

export const runtime = "nodejs";

/*
 * The card as an image. Every colour here is a literal because ImageResponse
 * renders in an isolated Satori context with no stylesheet and no CSS custom
 * properties — this file is the one place the tokens have to be repeated, and
 * these values are the --share-* set.
 */
const INK = "#17140F";
const ON_INK = "#FDFCFA";
const DIM = "rgba(253,252,250,0.52)";
const LINE = "rgba(253,252,250,0.12)";
const TRACK = "rgba(253,252,250,0.13)";
const MOSS = "#4FB287";
const SIGNAL = "#7BA6C4";

/**
 * Outfit, fetched once per lambda. A font failure must never take the card
 * down — Satori falls back to its built-in face and the card still renders,
 * so this returns undefined rather than throwing.
 */
let fontCache: ArrayBuffer | null | undefined;
async function displayFont(): Promise<ArrayBuffer | null> {
  if (fontCache !== undefined) return fontCache;
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Outfit:wght@800&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((r) => r.text());
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) throw new Error("no font url in css");
    fontCache = await fetch(url).then((r) => r.arrayBuffer());
  } catch (err) {
    console.error("[og] font fetch failed, falling back", err);
    fontCache = null;
  }
  return fontCache ?? null;
}


export interface CardLike {
  slug: string;
  /** Wrapped backdrop bytes, when the card has generated art. */
  art?: Buffer | null;
  label: string;
  value: string;
  tail: string;
  tone: "moss" | "signal";
  rarity: "rare" | null;
  symbol?: string | null;
}

/**
 * The instrument's mark for the image. Satori cannot fetch a relative URL, so
 * the bytes are inlined — and when there is no logo the tile is drawn in JSX
 * rather than as an SVG data URI, which Satori supports only partially.
 */
async function logoTile(symbol: string | null | undefined, size: number) {
  const ticker = normalizeSymbol(symbol);
  if (!ticker) return null;

  const png = await fetchLogoPng(ticker, 128);
  if (png) {
    const src = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
    return (
      <img
        src={src}
        width={size}
        height={size}
        style={{ borderRadius: size * 0.22, objectFit: "contain" }}
      />
    );
  }

  const { bg, fg } = TILE[toneIndex(ticker, TILE.length)];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: bg,
        color: fg,
        fontSize: size * 0.36,
        fontWeight: 800,
      }}
    >
      {monogram(ticker)}
    </div>
  );
}

/** The card image. Shared by the route and by visual checks. */
export async function renderCard(card: CardLike, cells: number[]) {
  const accent = card.tone === "signal" ? SIGNAL : MOSS;
  const font = await displayFont();
  const tile = await logoTile(card.symbol, 56);
  const art = card.art
    ? `data:image/png;base64,${Buffer.from(card.art).toString("base64")}`
    : null;
  // A long archetype name cannot be set at numeral size.
  const big = card.value.length <= 4;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: INK,
          color: ON_INK,
          padding: "64px 72px",
          fontFamily: font ? "Outfit" : "sans-serif",
        }}
      >
        {art ? (
          <img
            src={art}
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, opacity: 0.55 }}
          />
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {tile}
            <div style={{ fontSize: 24, letterSpacing: 3, color: DIM, textTransform: "uppercase" }}>
              {card.label}
            </div>
          </div>
          {card.rarity ? (
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: accent,
                border: `1px solid ${accent}`,
                borderRadius: 999,
                padding: "8px 20px",
              }}
            >
              {card.rarity}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: big ? 230 : 104,
              fontWeight: 800,
              letterSpacing: big ? -12 : -4,
              lineHeight: 1,
              color: accent,
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: 38, lineHeight: 1.35, marginTop: 20, maxWidth: 760 }}>
            {card.tail}
          </div>
        </div>

        {/* The receipt: the days behind the number. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {cells.map((c, i) => (
              <div
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: c === 2 ? SIGNAL : c === 1 ? MOSS : TRACK,
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: `1px solid ${LINE}`,
              paddingTop: 22,
              fontSize: 24,
              color: DIM,
            }}
          >
            <div>{`bagcheck.app/c/${card.slug}`}</div>
            <div style={{ letterSpacing: 3, textTransform: "uppercase" }}>verified</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: "Outfit", data: font, weight: 800, style: "normal" }] : undefined,
    },
  );
}
