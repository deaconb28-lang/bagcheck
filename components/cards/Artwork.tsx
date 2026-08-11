import styles from "./Artwork.module.css";
import type { CardHue, CardKind } from "@/lib/cards";

/**
 * The twelve artworks.
 *
 * **This is the Spotify move, made literal.** The picture is authored once
 * and worn by everyone: twelve fixed compositions, one per card kind, drawn
 * here and taking no data at all. What makes a card *yours* is the figure,
 * the sentence and the company set over it in type — never the art beneath.
 *
 * Fixed means fixed: a kind and a pigment, nothing else. No user figures, no
 * seed, no randomness. Two people with the same kind get the identical
 * picture, which is the point — a template is a voice, and a voice only
 * carries if it is the same one every time.
 *
 * **Flat, hard-edged, and printed rather than lit.** Every shape here is a
 * solid fill with a hard boundary: no gradient ground, no radial halo, no
 * glow, no blur. That is a correction, not a preference. Soft violet haze
 * behind a centred glyph is the house style of generated art, and a share
 * card wearing it announces that nobody drew it. Flat colour and a hard edge
 * are what a printed poster does, and a poster is what this is.
 *
 * Each composition is a picture of the statistic it carries: duration as
 * length, a ratio as two bars and the gap between them, discipline as an
 * unbroken band through noise, a drawdown as a wedge with the line you held
 * across it. Twelve geometries, so the deck reads as twelve statements
 * rather than one series in twelve colours.
 *
 * Pigment moves with the behaviour rather than the person — `lib/cards`
 * picks the hue from what the card says — and every value resolves from the
 * `--card-*` families in `styles/tokens.css`.
 */

/** Portrait, and cropped rather than squashed. */
const BOX = { w: 400, h: 600 } as const;

/* ── The twelve. Solid fills, hard edges, no soft light anywhere. ── */

/** health — a hard ring. A score is a dial, drawn as one. */
function Health() {
  return (
    <g>
      <circle cx="200" cy="252" r="132" fill="none" stroke="var(--art-mid)" strokeWidth="46" />
      <circle
        cx="200"
        cy="252"
        r="132"
        fill="none"
        stroke="var(--art-lit)"
        strokeWidth="46"
        strokeDasharray="622 829"
        transform="rotate(-90 200 252)"
      />
    </g>
  );
}

/** archetype — the four-bit cube. Three outlined, one filled: yours. */
function Archetype() {
  return (
    <g>
      <rect x="72" y="124" width="120" height="120" fill="var(--art-mid)" />
      <rect x="208" y="124" width="120" height="120" fill="var(--art-lit)" />
      <rect x="72" y="260" width="120" height="120" fill="var(--art-mid)" />
      <rect x="208" y="260" width="120" height="120" fill="var(--art-mid)" />
    </g>
  );
}

/** longestHold — duration as length: one band clear across the card. */
function LongestHold() {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={i * 50} y="150" width="26" height="46" fill="var(--art-mid)" />
      ))}
      <rect x="0" y="228" width="400" height="72" fill="var(--art-lit)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={i * 50 + 24} y="332" width="26" height="46" fill="var(--art-mid)" />
      ))}
    </g>
  );
}

/** holdRatio — two bars, and the gap between them is the statement. */
function HoldRatio() {
  return (
    <g>
      <rect x="40" y="150" width="104" height="72" fill="var(--art-lit)" />
      <rect x="40" y="266" width="320" height="72" fill="var(--art-mid)" />
      <rect x="140" y="126" width="6" height="240" fill="var(--art-lit)" />
      <rect x="354" y="126" width="6" height="240" fill="var(--art-mid)" />
    </g>
  );
}

/** noPanic — one unbroken band straight through the noise. */
function NoPanic() {
  const jitter = [
    [30, 128, 84], [76, 168, 52], [122, 108, 96], [168, 152, 64], [214, 118, 88],
    [260, 160, 56], [306, 122, 92], [352, 146, 68],
    [30, 336, 72], [76, 356, 52], [122, 322, 96], [168, 348, 64], [214, 330, 88],
    [260, 360, 48], [306, 326, 92], [352, 344, 68],
  ];
  return (
    <g>
      {jitter.map(([x, y, h], i) => (
        <rect key={i} x={x} y={y} width="18" height={h} fill="var(--art-mid)" />
      ))}
      <rect x="0" y="268" width="400" height="26" fill="var(--art-lit)" />
    </g>
  );
}

/** streak — an unbroken run of marks. */
function Streak() {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5].map((c) =>
        [0, 1, 2, 3].map((r) => (
          <rect
            key={`${c}-${r}`}
            x={44 + c * 54}
            y={132 + r * 66}
            width="34"
            height="46"
            fill={r === 0 ? "var(--art-lit)" : "var(--art-mid)"}
          />
        )),
      )}
    </g>
  );
}

/** bestDecision — a hard wedge climbing off the top corner. */
function BestDecision() {
  return (
    <g>
      <path d="M0 420 L400 96 L400 420 Z" fill="var(--art-mid)" />
      <path d="M0 420 L400 96 L400 168 L0 420 Z" fill="var(--art-lit)" />
    </g>
  );
}

/** drawdownHeld — the trough, and the line you held flat across it. */
function DrawdownHeld() {
  return (
    <g>
      <path d="M0 156 L200 420 L400 156 L400 440 L0 440 Z" fill="var(--art-mid)" />
      <rect x="0" y="142" width="400" height="18" fill="var(--art-lit)" />
    </g>
  );
}

/** cadence — hard wedges off one point. Rhythm, as a fan. */
function Cadence() {
  const spokes = [-60, -36, -12, 12, 36, 60];
  return (
    <g>
      {spokes.map((deg, i) => (
        <rect
          key={deg}
          x="192"
          y="120"
          width="16"
          height="300"
          fill={i === 2 || i === 3 ? "var(--art-lit)" : "var(--art-mid)"}
          transform={`rotate(${deg} 200 420)`}
        />
      ))}
    </g>
  );
}

/** monthlyPnl — twelve solid blocks off a hard midline. */
function MonthlyPnl() {
  const months = [44, 82, -34, 96, 58, -62, 112, 40, -24, 86, 68, 124];
  return (
    <g>
      {months.map((v, i) => {
        const h = Math.abs(v);
        return (
          <rect
            key={i}
            x={16 + i * 31}
            y={v > 0 ? 272 - h : 272}
            width="22"
            height={h}
            fill={v > 0 ? "var(--art-lit)" : "var(--art-mid)"}
          />
        );
      })}
      <rect x="0" y="268" width="400" height="8" fill="var(--art-mid)" />
    </g>
  );
}

/** equity — a stepped climb, filled solid. The year, as a staircase. */
function Equity() {
  const tops = [292, 258, 274, 208, 230, 160, 178, 108];
  return (
    <g>
      {tops.map((top, i) => (
        <rect
          key={i}
          x={i * 50}
          y={top}
          width="50"
          height={430 - top}
          fill={i === tops.length - 1 ? "var(--art-lit)" : "var(--art-mid)"}
        />
      ))}
    </g>
  );
}

/** correlation — two fields, and the hard lens where they meet. */
function Correlation() {
  return (
    <g>
      <circle cx="146" cy="258" r="122" fill="var(--art-mid)" />
      <circle cx="254" cy="258" r="122" fill="var(--art-mid)" />
      <path d="M200 152 A122 122 0 0 1 200 364 A122 122 0 0 1 200 152 Z" fill="var(--art-lit)" />
    </g>
  );
}

const FIGURES: Record<CardKind, () => React.JSX.Element> = {
  health: Health,
  archetype: Archetype,
  longestHold: LongestHold,
  holdRatio: HoldRatio,
  noPanic: NoPanic,
  streak: Streak,
  bestDecision: BestDecision,
  drawdownHeld: DrawdownHeld,
  cadence: Cadence,
  monthlyPnl: MonthlyPnl,
  equity: Equity,
  correlation: Correlation,
  /* The annual summary wears the dial, read as a whole year. */
  wrapped: Health,
};

export function Artwork({ kind, hue = "moss" }: { kind: CardKind; hue?: CardHue }) {
  const Figure = FIGURES[kind] ?? Health;
  return (
    <svg
      className={styles.art}
      data-hue={hue}
      viewBox={`0 0 ${BOX.w} ${BOX.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={BOX.w} height={BOX.h} fill="var(--art-deep)" />
      {/*
        * Drawn at full size and centred. The card crops this to a band across
        * its top, so the figures run edge to edge and are cut by the frame
        * rather than floating inside it — a graphic band, the way a printed
        * poster crops its image, instead of a motif marooned in white space.
        */}
      {/*
        * Composed square, then fitted to the band the card actually crops to.
        * The figures are drawn against a 400x600 frame because that is the
        * shape of the card, but the band is nearer 2.4:1 — so they are halved
        * and re-centred on it. Without this the ring was sliced through its
        * waist and read as two brackets rather than a dial.
        */}
      <g transform="translate(100 174) scale(0.5)">
        <Figure />
      </g>
    </svg>
  );
}
