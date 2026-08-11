import styles from "./Artwork.module.css";
import type { CardHue, CardKind } from "@/lib/cards";

/**
 * The twelve artworks.
 *
 * **This is the Spotify move, made literal.** The picture is authored once
 * and worn by everyone: twelve fixed compositions, one per card kind, drawn
 * here in SVG and CSS and taking no data at all. What makes a card *yours* is
 * the figure, the sentence and the company set over it in type by
 * `WrappedCard` — never the art underneath.
 *
 * Fixed means fixed. These take a kind and a pigment and nothing else: no
 * user figures, no seeds, no randomness. Two people with the same kind get
 * the identical picture, which is the point — a template is a voice, and a
 * voice only carries if it is the same one every time.
 *
 * Each composition is a picture of the statistic it carries, not decoration
 * assigned at random: duration is drawn as length, a ratio as two bars and
 * the gap between them, discipline as a straight line through noise, a
 * drawdown as a trough with a line held across it. Twelve geometries, so the
 * deck reads as twelve statements rather than one series in twelve colours.
 *
 * Pigment is the one thing that moves, and it moves with the behaviour rather
 * than with the person: `lib/cards/kinds.ts` picks the hue from what the card
 * says — moss when it went right, azure when it is a comparison, ember for a
 * record, violet for Bagcheck's own reading. Every value comes from the
 * `--card-*` families in `styles/tokens.css`.
 */

/** Where the art is drawn. Portrait, and cropped rather than squashed. */
const BOX = { width: 400, height: 600 } as const;

function Ground({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="var(--art-mid)" />
        <stop offset="55%" stopColor="var(--art-deep)" />
        <stop offset="100%" stopColor="var(--art-deep)" />
      </linearGradient>
      <radialGradient id={`${id}-halo`} cx="50%" cy="42%" r="58%">
        <stop offset="0%" stopColor="var(--art-lit)" stopOpacity="0.34" />
        <stop offset="100%" stopColor="var(--art-lit)" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/* ── The twelve. Each returns the figure only; the ground is shared. ── */

/** health — a dial. Concentric rings with one arc lit: a score is a ring. */
function Health() {
  const rings = [150, 122, 94, 66];
  return (
    <g>
      {rings.map((r, i) => (
        <circle
          key={r}
          cx="200"
          cy="300"
          r={r}
          fill="none"
          stroke="var(--art-lit)"
          strokeWidth={i === 0 ? 14 : 2}
          strokeOpacity={i === 0 ? 0.14 : 0.2 - i * 0.04}
        />
      ))}
      <circle
        cx="200"
        cy="300"
        r="150"
        fill="none"
        stroke="var(--art-lit)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray="672 943"
        transform="rotate(-90 200 300)"
      />
    </g>
  );
}

/** archetype — the four-bit cube, one corner lit. Three quiet, one yours. */
function Archetype() {
  const cells = [
    { x: 96, y: 196, on: false },
    { x: 204, y: 196, on: true },
    { x: 96, y: 304, on: false },
    { x: 204, y: 304, on: false },
  ];
  return (
    <g>
      {cells.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x}
          y={c.y}
          width="100"
          height="100"
          rx="18"
          fill={c.on ? "var(--art-lit)" : "none"}
          fillOpacity={c.on ? 0.9 : 0}
          stroke="var(--art-lit)"
          strokeWidth="2"
          strokeOpacity={c.on ? 0 : 0.26}
        />
      ))}
    </g>
  );
}

/** longestHold — duration drawn as length: one band crossing the whole card. */
function LongestHold() {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <line
          key={i}
          x1={40 + i * 40}
          y1="248"
          x2={40 + i * 40}
          y2="268"
          stroke="var(--art-lit)"
          strokeWidth="2"
          strokeOpacity="0.3"
        />
      ))}
      <rect x="0" y="284" width="400" height="34" fill="var(--art-lit)" fillOpacity="0.92" />
      <rect x="0" y="284" width="400" height="34" fill="url(#art-fade)" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <line
          key={i}
          x1={40 + i * 40}
          y1="334"
          x2={40 + i * 40}
          y2="354"
          stroke="var(--art-lit)"
          strokeWidth="2"
          strokeOpacity="0.3"
        />
      ))}
      <defs>
        <linearGradient id="art-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--art-deep)" stopOpacity="0.75" />
          <stop offset="42%" stopColor="var(--art-deep)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </g>
  );
}

/** holdRatio — two bars, and the gap between them is the whole statement. */
function HoldRatio() {
  return (
    <g>
      <rect x="48" y="236" width="96" height="30" rx="15" fill="var(--art-lit)" fillOpacity="0.95" />
      <rect x="48" y="236" width="304" height="30" rx="15" fill="none" stroke="var(--art-lit)" strokeWidth="1.5" strokeOpacity="0.24" />
      <rect x="48" y="334" width="304" height="30" rx="15" fill="var(--art-lit)" fillOpacity="0.42" />
      <line x1="144" y1="212" x2="144" y2="388" stroke="var(--art-lit)" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="4 7" />
      <line x1="352" y1="212" x2="352" y2="388" stroke="var(--art-lit)" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="4 7" />
    </g>
  );
}

/** noPanic — a dead-straight line through a field of jitter. Calm, drawn. */
function NoPanic() {
  const strokes = [
    [40, 214], [76, 258], [112, 196], [148, 246], [184, 182], [220, 252],
    [256, 204], [292, 262], [328, 190], [364, 240],
    [40, 366], [76, 402], [112, 348], [148, 396], [184, 420], [220, 356],
    [256, 408], [292, 350], [328, 398], [364, 362],
  ];
  return (
    <g>
      {strokes.map(([x, y], i) => (
        <line
          key={i}
          x1={x}
          y1={y - 16}
          x2={x}
          y2={y + 16}
          stroke="var(--art-lit)"
          strokeWidth="2"
          strokeOpacity="0.22"
        />
      ))}
      <line x1="0" y1="300" x2="400" y2="300" stroke="var(--art-lit)" strokeWidth="5" strokeOpacity="0.95" />
    </g>
  );
}

/** streak — a run of tallies, evenly spaced and unbroken. */
function Streak() {
  const cols = [0, 1, 2, 3, 4, 5, 6];
  return (
    <g>
      {cols.map((c) =>
        [0, 1, 2].map((r) => (
          <rect
            key={`${c}-${r}`}
            x={44 + c * 46}
            y={228 + r * 52}
            width="14"
            height="38"
            rx="7"
            fill="var(--art-lit)"
            fillOpacity={0.9 - r * 0.22}
          />
        )),
      )}
      <line x1="30" y1="300" x2="370" y2="300" stroke="var(--art-lit)" strokeWidth="1.5" strokeOpacity="0.3" />
    </g>
  );
}

/** bestDecision — one rising beam, with the light at its head. */
function BestDecision() {
  return (
    <g>
      <path d="M20 470 L380 190" stroke="var(--art-lit)" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.95" />
      <path d="M20 470 L380 190 L380 470 Z" fill="var(--art-lit)" fillOpacity="0.12" />
      <circle cx="380" cy="190" r="10" fill="var(--art-lit)" />
      <circle cx="380" cy="190" r="30" fill="var(--art-lit)" fillOpacity="0.16" />
      <circle cx="380" cy="190" r="56" fill="var(--art-lit)" fillOpacity="0.07" />
    </g>
  );
}

/** drawdownHeld — a trough, with the line you held drawn straight across it. */
function DrawdownHeld() {
  return (
    <g>
      <path
        d="M10 236 L110 268 L200 430 L290 268 L390 236"
        fill="none"
        stroke="var(--art-lit)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.95"
      />
      <path d="M10 236 L110 268 L200 430 L290 268 L390 236 L390 470 L10 470 Z" fill="var(--art-lit)" fillOpacity="0.1" />
      <line x1="0" y1="236" x2="400" y2="236" stroke="var(--art-lit)" strokeWidth="1.5" strokeOpacity="0.45" strokeDasharray="5 8" />
    </g>
  );
}

/** cadence — a metronome fan. Rhythm as spokes off one point. */
function Cadence() {
  const spokes = [-64, -48, -32, -16, 0, 16, 32, 48, 64];
  return (
    <g>
      {spokes.map((deg, i) => (
        <line
          key={deg}
          x1="200"
          y1="452"
          x2="200"
          y2="176"
          stroke="var(--art-lit)"
          strokeWidth={deg === 0 ? 5 : 2.5}
          strokeLinecap="round"
          strokeOpacity={deg === 0 ? 0.95 : 0.5 - Math.abs(i - 4) * 0.07}
          transform={`rotate(${deg} 200 452)`}
        />
      ))}
      <circle cx="200" cy="452" r="9" fill="var(--art-lit)" />
    </g>
  );
}

/** monthlyPnl — twelve blocks off a midline. The year, as bars. */
function MonthlyPnl() {
  const months = [38, 62, -26, 74, 44, -48, 88, 30, -18, 66, 52, 96];
  return (
    <g>
      {months.map((v, i) => {
        const x = 26 + i * 30;
        const h = Math.abs(v);
        return (
          <rect
            key={i}
            x={x}
            y={v > 0 ? 300 - h : 300}
            width="18"
            height={h}
            rx="5"
            fill="var(--art-lit)"
            fillOpacity={v > 0 ? 0.92 : 0.36}
          />
        );
      })}
      <line x1="0" y1="300" x2="400" y2="300" stroke="var(--art-lit)" strokeWidth="1.5" strokeOpacity="0.4" />
    </g>
  );
}

/** equity — a topographic field. The shape of a year, in contours. */
function Equity() {
  const lines = [0, 1, 2, 3, 4, 5];
  return (
    <g>
      {lines.map((i) => (
        <path
          key={i}
          d={`M-10 ${380 - i * 34} C 70 ${332 - i * 34}, 120 ${404 - i * 34}, 200 ${344 - i * 34} S 330 ${252 - i * 34}, 410 ${292 - i * 34}`}
          fill="none"
          stroke="var(--art-lit)"
          strokeWidth={i === 0 ? 5 : 2}
          strokeLinecap="round"
          strokeOpacity={i === 0 ? 0.95 : 0.34 - i * 0.05}
        />
      ))}
    </g>
  );
}

/** correlation — two fields overlapping. The lens is where the finding is. */
function Correlation() {
  return (
    <g>
      <circle cx="146" cy="300" r="118" fill="var(--art-lit)" fillOpacity="0.16" stroke="var(--art-lit)" strokeWidth="2" strokeOpacity="0.4" />
      <circle cx="254" cy="300" r="118" fill="var(--art-lit)" fillOpacity="0.16" stroke="var(--art-lit)" strokeWidth="2" strokeOpacity="0.4" />
      <path
        d="M200 190 A118 118 0 0 1 200 410 A118 118 0 0 1 200 190 Z"
        fill="var(--art-lit)"
        fillOpacity="0.78"
      />
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
  /* The summary card wears the annual mark: the same rings, read as a year. */
  wrapped: Health,
};

export function Artwork({ kind, hue = "moss" }: { kind: CardKind; hue?: CardHue }) {
  const Figure = FIGURES[kind] ?? Health;
  const id = `art-${kind}`;
  return (
    <svg
      className={styles.art}
      data-hue={hue}
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <Ground id={id} />
      <rect width={BOX.width} height={BOX.height} fill={`url(#${id}-ground)`} />
      <rect width={BOX.width} height={BOX.height} fill={`url(#${id}-halo)`} />
      <Figure />
    </svg>
  );
}
