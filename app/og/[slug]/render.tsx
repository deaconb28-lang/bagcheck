import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { FORMAT_SIZE, type ShareFormat } from "@/lib/cards/share";
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
  /** The card kind — which of the twelve fixed backdrops it wears. */
  type: string;
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

/**
 * The fixed backdrop for a card kind, as a data URI.
 *
 * Cached in the module: twelve files, read once per process rather than once
 * per unfurl. A missing file is not an error — the card renders on the flat
 * ink field, which is a complete card.
 */
const artCache = new Map<string, string | null>();
async function fixedArt(kind: string): Promise<string | null> {
  if (artCache.has(kind)) return artCache.get(kind) ?? null;
  let uri: string | null = null;
  try {
    const bytes = await readFile(join(process.cwd(), "public", "cards", `${kind}.jpg`));
    uri = `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch {
    uri = null;
  }
  artCache.set(kind, uri);
  return uri;
}

/** The card image. Shared by the route and by visual checks. */
/**
 * Three frames from one composition.
 *
 * `unfurl` is 1200×630, what a pasted link expands to. `feed` is 1080×1350,
 * the tallest the Instagram feed shows without cropping. `story` is 1080×1920
 * for stories, Reels and TikTok. Same card, re-proportioned — a 16:9 unfurl
 * letterboxed into a 9:16 story is a postage stamp with black above and below
 * it, which is the shape people scroll past.
 *
 * The scale factor keeps the type optically the same size in all three: the
 * padding and the figure are expressed against the frame's own width.
 */
export async function renderCard(
  card: CardLike,
  cells: number[],
  format: ShareFormat = "unfurl",
  /**
   * Publication options. `scale` multiplies the whole frame (type included,
   * since everything is expressed against the frame's own width) — 2× the
   * story frame is a 2160×3840 press asset. `rounded` clips the card to a
   * radius and leaves the corners transparent, so it can sit inside a
   * newsletter without a black plate behind it.
   */
  opts: { scale?: number; rounded?: boolean } = {},
) {
  const scale = Math.min(4, Math.max(1, opts.scale ?? 1));
  const base = FORMAT_SIZE[format];
  const w = Math.round(base.w * scale);
  const h = Math.round(base.h * scale);
  /*
   * The notional width the composition is drawn against. Everything below is
   * expressed in those units and multiplied by `k`.
   */
  const CONTENT = { unfurl: 1200, feed: 780, story: 660 } as const;
  const k = w / CONTENT[format];
  const px = (n: number) => Math.round(n * k);
  const accent = card.tone === "signal" ? SIGNAL : MOSS;
  const font = await displayFont();
  const tile = await logoTile(card.symbol, Math.round(56 * (w / CONTENT[format])));
  /*
   * The kind's fixed artwork, read off disk and inlined — Satori has no
   * network. Twelve images authored once and committed, one per kind: a
   * Wrapped template is designed once and worn by millions, and what makes a
   * card yours is the figure and the company set over it, not a private
   * painting nobody else will ever see.
   */
  const art = await fixedArt(card.type);
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
          padding: `${px(format === "unfurl" ? 64 : 78)}px ${px(72)}px`,
          fontFamily: font ? "Outfit" : "sans-serif",
          borderRadius: opts.rounded ? px(52) : 0,
          overflow: "hidden",
        }}
      >
        {art ? (
          <img
            src={art}
            width={w}
            height={h}
            style={{ position: "absolute", top: 0, left: 0, opacity: 0.55 }}
          />
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: px(20) }}>
            {tile}
            <div style={{ fontSize: px(24), letterSpacing: px(3), color: DIM, textTransform: "uppercase" }}>
              {card.label}
            </div>
          </div>
          {card.rarity ? (
            <div
              style={{
                display: "flex",
                fontSize: px(22),
                letterSpacing: px(3),
                textTransform: "uppercase",
                color: accent,
                border: `1px solid ${accent}`,
                borderRadius: 999,
                padding: `${px(8)}px ${px(20)}px`,
              }}
            >
              {card.rarity}
            </div>
          ) : null}
        </div>

        {/*
          * `margin: auto 0` centres the figure in whatever space is left
          * between the header and the receipt. On the 16:9 unfurl there is
          * almost none and it changes nothing; on a 9:16 story it is the
          * difference between a centred card and a number stranded near the
          * top with a third of the frame empty under it.
          */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            /*
             * flexGrow + centred justification, not `margin: auto` — Satori
             * does not honour the margin shorthand, so the auto-margin
             * version silently left the figure pinned near the top.
             */
            flexGrow: format === "unfurl" ? 0 : 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: px(big ? 230 : 104),
              fontWeight: 800,
              letterSpacing: px(big ? -12 : -4),
              lineHeight: 1,
              color: accent,
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: px(38), lineHeight: 1.35, marginTop: px(20), maxWidth: px(760) }}>
            {card.tail}
          </div>
        </div>

        {/* The receipt: the days behind the number. */}
        <div style={{ display: "flex", flexDirection: "column", gap: px(28) }}>
          <div style={{ display: "flex", gap: px(8) }}>
            {cells.map((c, i) => (
              <div
                key={i}
                style={{
                  width: px(14),
                  height: px(14),
                  borderRadius: px(3),
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
              paddingTop: px(22),
              fontSize: px(24),
              color: DIM,
            }}
          >
            <div>{`bagcheck.app/c/${card.slug}`}</div>
            <div style={{ letterSpacing: px(3), textTransform: "uppercase" }}>verified</div>
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      fonts: font ? [{ name: "Outfit", data: font, weight: 800, style: "normal" }] : undefined,
    },
  );
}
