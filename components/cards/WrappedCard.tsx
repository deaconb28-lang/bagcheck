import type { Archetype } from "@/lib/archetypes";
import styles from "./WrappedCard.module.css";

export type CardHue = "moss" | "ember" | "azure" | "violet";

export interface CardBeat {
  /** Mono label — what the row is. */
  label: string;
  /** One short phrase under it. */
  detail: string;
}

export type WrappedCardProps = {
  /** Mono line at the very top. */
  eyebrow: string;
  /** Small word above the headline — "MOST", "YOUR", "THE". */
  kicker: string;
  /** The headline. One word, set enormous. */
  headline: string;
  /** Two short lines under the headline. Sentences, not labels. */
  lede: string;
  /** What the big figure measures. */
  metricLabel: string;
  /** The figure itself. */
  value: string;
  /** Trailing unit — "/10", "%", "days". Set smaller, on the baseline. */
  unit?: string;
  /** The pill beside the figure — a comparison, never a benchmark. */
  chip?: string | null;
  /**
   * A card carries a spine of beats or a chart of sessions — never both.
   *
   * Enforced by the type rather than by review, and not only because both
   * together overflow a 2:3 box at every size: one idiom per statement is
   * the rule everywhere else in the product, and a card is the surface where
   * breaking it is most expensive. The chart's values are real, never a
   * pattern — it is the only part of a card that shows its work.
   */
  body:
    | { kind: "beats"; beats: CardBeat[] }
    | { kind: "chart"; strip: number[]; labels?: string[] };
  /** The card's own URL once minted. Null before it exists. */
  slug: string | null;
  /** Footer line, left of the URL. */
  footLabel: string;
  footDetail: string;
  /** Generated backdrop. The scene only — every word here is set by us. */
  backdrop?: string | null;
  hue?: CardHue;
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
  metricLabel,
  value,
  unit,
  chip = null,
  body,
  slug,
  footLabel,
  footDetail,
  backdrop = null,
  hue = "moss",
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
    <article className={styles.card} data-hue={hue}>
      {backdrop ? (
        // eslint-disable-next-line @next/next/no-img-element -- a stored PNG
        // at a fixed URL, sized by the card; next/image buys nothing here.
        <img src={backdrop} alt="" className={styles.scene} />
      ) : null}
      <div className={styles.wash} aria-hidden="true" />

      <div className={styles.inner}>
        <header className={styles.top}>
          <span className={styles.eyebrow}>{eyebrow}</span>
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

        <div className={styles.middle} data-body={body.kind}>
          {body.kind === "beats" ? (
            <ol className={styles.beats}>
              {body.beats.slice(0, 4).map((beat) => (
                <li key={beat.label} className={styles.beat}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.beatLabel}>{beat.label}</span>
                  <span className={styles.beatDetail}>{beat.detail}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <div className={styles.metric}>
            <span className={styles.metricLabel}>{metricLabel}</span>
            <div className={styles.figure}>
              <span className={styles.value}>{value}</span>
              {unit ? <span className={styles.unit}>{unit}</span> : null}
            </div>
            {chip ? <span className={styles.chip}>{chip}</span> : null}

            {body.kind === "chart" ? (
              <div className={styles.chart} aria-hidden="true">
                {series.map((v, i) => (
                  <span key={i} className={styles.barCol}>
                    <span
                      className={styles.bar}
                      data-sign={v < 0 ? "down" : "up"}
                      style={{ height: `${Math.max(8, (Math.abs(v) / peak) * 100)}%` }}
                    />
                    {body.labels?.[i] ? (
                      <span className={styles.barLabel}>{body.labels[i]}</span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <footer className={styles.foot}>
          {/*
            * Two rows, not two columns. Side by side, the provenance line and
            * the URL compete for the same 60% of the card and both truncate —
            * and a card whose provenance line is cut off is a card that has
            * stopped making its own argument.
            */}
          <div className={styles.footRow}>
            <span className={styles.footLabel}>{footLabel}</span>
            <span className={styles.url}>
              {slug ? `bagcheck.app/c/${slug}` : "minted when you share"}
            </span>
          </div>
          <span className={styles.footDetail}>{footDetail}</span>
        </footer>
      </div>
    </article>
  );
}
