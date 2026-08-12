import type { Archetype } from "@/lib/archetypes";
import type { CardKind } from "@/lib/cards";
import { Logo } from "@/components/primitives";
import { Artwork } from "./Artwork";
import styles from "./WrappedCard.module.css";

export type CardHue = "moss" | "ember" | "azure" | "violet";
export type CardLayout =
  | "poster"
  | "numeral"
  | "stamp"
  | "editorial"
  | "ledger"
  | "chartfirst";

export interface CardBeat {
  /** Mono label — what the row is. */
  label: string;
  /** One short phrase under it. */
  detail: string;
}

export type CardBody =
  | { kind: "figure"; label: string; value: string; unit?: string }
  | { kind: "beats"; beats: CardBeat[] }
  | { kind: "chart"; label: string; value: string; unit?: string; strip: number[]; labels?: string[] };

export type WrappedCardProps = {
  /** Mono line at the very top. */
  eyebrow: string;
  /** Small word above the headline — "MOST", "YOUR", "THE". */
  kicker: string;
  /** The headline. One word, set enormous. */
  headline: string;
  /** Two short lines under the headline. Sentences, not labels. */
  lede: string;
  /**
   * The one statement the card makes: a figure, a spine of beats, or a chart.
   *
   * Enforced by the type rather than by review. A card is read in a feed in
   * about a second, and the first draft carried a figure *and* a spine *and*
   * a chart *and* a chip — four ideas, so none of them landed, and it
   * overflowed a 2:3 box at every size. One idiom per statement is the rule
   * everywhere else in the product; this is the surface where breaking it
   * costs most. Chart values are real, never a pattern.
   */
  body: CardBody;
  /** The card's own URL once minted. Null before it exists. */
  slug: string | null;
  /**
   * The provenance line. One sentence, because the footer band is one line
   * plus the URL — a label and a sentence side by side both truncate, and
   * they were saying the same thing twice.
   */
  provenance: string;
  /**
   * Which of the twelve artworks sits under the type.
   *
   * The picture is fixed per kind and authored once in `Artwork.tsx` — it
   * takes no data, so everyone with this kind gets the identical scene. What
   * makes the card someone's own is the type composited over it.
   */
  kind?: CardKind;
  /** The photographic ground for this kind, when the store has one. */
  photo?: { url: string; color: string } | null;
  hue?: CardHue;
  /**
   * Which of the six templates this card is set in. Assigned per kind in
   * `lib/cards/kinds.ts`, never chosen here and never random — twelve cards
   * in one template is a series, and a series is what people scroll past.
   */
  layout?: CardLayout;
  /**
   * The instrument the card is about, when it is about one.
   *
   * This is the Spotify move made literal: the artwork is fixed and shared,
   * and what makes the card *yours* is your figure and your company set over
   * it. A card about a position wears that company's mark and ticker.
   */
  symbol?: string | null;
  /**
   * Fill the container instead of holding 2:3.
   *
   * The story player is 9:16 and a 2:3 card inside it leaves dead bands top
   * and bottom — so in the player the card *is* the slide rather than sitting
   * on one.
   */
  fill?: boolean;
  /** Earned by behaviour, never bought. */
  rarity?: "rare" | null;
  archetype?: Archetype;
  /**
   * Marks the card as an illustration rather than a record. Set on the
   * marketing page, where the figures are not anyone's. Never set in-app.
   */
  example?: boolean;
};

const BARS = 12;

/**
 * The Wrapped card.
 *
 * **The model draws the scene. We set every word and every number.** That
 * split is not a style choice — a generated "9.4" is a figure nobody can
 * correct after the fact, on an artefact whose entire claim is that its
 * numbers came from a brokerage. So the backdrop is art and the type is
 * HTML, and `lib/wrapped/prompt.ts` forbids the model from drawing a glyph.
 *
 * Portrait 2:3, because that is the shape a story and a feed post both want.
 * Full-bleed, saturated, and set in a condensed poster face — a share card is
 * the one surface that is not the instrument, and a card that whispers in a
 * feed is a card nobody opens.
 *
 * One hue per card, drawn from the `--card-*` families. Never two.
 */
export function WrappedCard({
  eyebrow,
  kicker,
  headline,
  lede,
  body,
  slug,
  provenance,
  kind = "wrapped",
  photo = null,
  hue = "moss",
  layout = "poster",
  symbol = null,
  fill = false,
  rarity = null,
  example = false,
}: WrappedCardProps) {
  /*
   * Scaled against the largest absolute move in the window, so a quiet month
   * and a violent one both fill the chart. A floor of 8% keeps a flat session
   * visible as a session rather than as nothing.
   */
  const series = body.kind === "chart" ? body.strip.slice(-BARS) : [];
  const peak = Math.max(1, ...series.map(Math.abs));

  return (
    <article className={styles.card} data-hue={hue} data-layout={layout} data-fill={fill || undefined}>
      {/*
        * The ledger template is the one card with no scene at all — a flat
        * field, mono, instrument-like. Everywhere else the artwork is the
        * ground, drawn in SVG rather than fetched as an image: it is crisp at
        * any export size, costs no bytes, and repigments with the card.
        */}
      {layout !== "ledger" ? (
        <div className={styles.scene}>
          <Artwork kind={kind} hue={hue} photo={photo} />
        </div>
      ) : null}
      <div className={styles.wash} aria-hidden="true" />

      <div className={styles.inner}>
        <header className={styles.top}>
          <span className={styles.eyebrow}>
            {symbol ? <Logo symbol={symbol} size={22} /> : null}
            {eyebrow}
          </span>
          <div className={styles.tags}>
            {example ? <span className={styles.tag}>Example</span> : null}
            {/* Scarcity is carried by the word, never by a colour. */}
            {rarity ? <span className={styles.tagLit}>Scarce</span> : null}
          </div>
        </header>
        <span className={styles.rule} aria-hidden="true" />

        <div className={styles.title}>
          <span className={styles.kicker}>{kicker}</span>
          <h1 className={styles.headline}>{headline}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>

        <div className={styles.statement} data-body={body.kind}>
          {body.kind === "beats" ? (
            <ol className={styles.beats}>
              {body.beats.slice(0, 3).map((beat) => (
                <li key={beat.label} className={styles.beat}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.beatLabel}>{beat.label}</span>
                  <span className={styles.beatDetail}>{beat.detail}</span>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <span className={styles.metricLabel}>{body.label}</span>
              <div className={styles.figure}>
                <span className={styles.value}>{body.value}</span>
                {body.unit ? <span className={styles.unit}>{body.unit}</span> : null}
              </div>
            </>
          )}

          {body.kind === "chart" ? (
            <div className={styles.chart} aria-hidden="true">
              {series.map((v, i) => (
                <span key={i} className={styles.barCol}>
                  <span
                    className={styles.bar}
                    data-sign={v < 0 ? "down" : "up"}
                    style={{ height: `${Math.max(6, (Math.abs(v) / peak) * 100)}%` }}
                  />
                  {body.labels?.[i] ? (
                    <span className={styles.barLabel}>{body.labels[i]}</span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/*
          * Two rows, not two columns. Side by side, the provenance line and
          * the URL compete for the same half of the card and both truncate —
          * and a card whose URL is cut off has broken the only loop it exists
          * to run.
          */}
        <footer className={styles.foot}>
          <span className={styles.footDetail}>{provenance}</span>
          <span className={styles.url}>
            {slug ? `bagcheck.app/c/${slug}` : "minted when you share"}
          </span>
        </footer>
      </div>
    </article>
  );
}
