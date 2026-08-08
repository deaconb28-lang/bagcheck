import { WrappedCard } from "@/components/cards/WrappedCard";
import styles from "./marketing.module.css";

/*
 * A fixed series, generated once here rather than sampled from anyone. The
 * card says "Example" on its face for exactly that reason: the whole argument
 * of this section is that Bagcheck's numbers come from a brokerage, so an
 * illustration has to say that it is one.
 */
const EXAMPLE_STRIP = Array.from({ length: 12 }, (_, i) =>
  Math.round((Math.sin(i * 0.62) * 1.4 + Math.cos(i * 0.29) + i * 0.22 - 0.4) * 140),
);

/**
 * Three earned cards, dealt like a hand — the collectible mechanic made
 * literal. The centre card is the rare one, and it sits on top because
 * scarcity here is a fact about the behaviour, not a purchase.
 *
 * All three are the real `<WrappedCard>`, the same component the app renders
 * and the same one a minted URL unfurls as. What someone is shown before
 * signing up is the thing they get.
 *
 * One hue each, and each card carries a spine or a chart, never both.
 */
export function WrappedFan() {
  return (
    <div className={styles.fanWrap}>
      <div className={`${styles.fanCard} ${styles.fanLeft}`}>
        <WrappedCard
          eyebrow="Bagcheck · Q3"
          kicker="Zero"
          headline="Panic"
          lede="A quarter that gave you three chances to sell low."
          metricLabel="Panic sells"
          value="0"
          chip="Across 61 scored sessions"
          body={{
            kind: "beats",
            beats: [
              { label: "March", detail: "Held through 14%" },
              { label: "June", detail: "Held through 9%" },
              { label: "August", detail: "Held through 11%" },
            ],
          }}
          slug="q3-no-panic"
          provenance="Read from your brokerage. Read-only, permanently."
          backdrop="/cards/moss-consistency.png"
          hue="moss"
          example
        />
      </div>

      <div className={`${styles.fanCard} ${styles.fanRight}`}>
        <WrappedCard
          eyebrow="Bagcheck · archetype"
          kicker="The"
          headline="Sentinel"
          lede="You wait for your own setup, then wait again after taking it."
          metricLabel="Health, end of year"
          value="82"
          unit="/100"
          chip="Adherence and patience above 60"
          body={{
            kind: "beats",
            beats: [
              { label: "Adherence", detail: "78 — the plan has not drifted" },
              { label: "Patience", detail: "84 — winners held 3× longer" },
              { label: "Exposure", detail: "51 — inside your own band" },
            ],
          }}
          slug="archetype-sentinel"
          provenance="Read from your brokerage. Read-only, permanently."
          backdrop="/cards/azure-adherence.png"
          hue="azure"
          example
        />
      </div>

      <div className={`${styles.fanCard} ${styles.fanCenter}`}>
        <WrappedCard
          eyebrow="Bagcheck · 2026"
          kicker="Longest"
          headline="Hold"
          lede="Four hundred and twelve days on one position."
          metricLabel="Days held"
          value="412"
          unit="days"
          chip="Longest of your 37 round trips"
          body={{
            kind: "chart",
            strip: EXAMPLE_STRIP,
            labels: ["S", "O", "N", "D", "J", "F", "M", "A", "M", "J", "J", "A"],
          }}
          slug="412-days"
          provenance="Read from your brokerage. Read-only, permanently."
          backdrop="/cards/ember-exposure.png"
          hue="ember"
          rarity="rare"
          example
        />
      </div>
    </div>
  );
}
