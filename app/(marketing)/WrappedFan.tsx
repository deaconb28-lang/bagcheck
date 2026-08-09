import { WrappedCard } from "@/components/cards/WrappedCard";
import { buildCards } from "@/lib/cards/kinds";
import { exampleLedger } from "./exampleLedger";
import styles from "./marketing.module.css";

/*
 * One backdrop per kind, not per hue. Twelve cards on four shared pictures
 * read as four cards printed three times each — the eye takes the picture
 * before the headline.
 */
const backdrop = (kind: string) => `/cards/${kind}.jpg`;

/**
 * Three earned cards, dealt like a hand — the collectible mechanic made
 * literal. The centre card is the rare one, and it sits on top because
 * scarcity here is a fact about the behaviour, not a purchase.
 *
 * Built by `buildCards` from one example ledger, so these are the real twelve
 * kinds running the real sample floors and rarity rules rather than three
 * hand-written mocks that would drift from the product inside a week. Each
 * one says "Example" on its face.
 */
export function WrappedFan() {
  const cards = buildCards(exampleLedger(2026));
  const pick = (kind: string) => cards.find((c) => c.kind === kind);
  const centre = pick("longestHold");
  const left = pick("noPanic");
  const right = pick("archetype");
  if (!left || !centre || !right) return null;

  const slots = [
    { card: left, cls: styles.fanLeft },
    { card: right, cls: styles.fanRight },
    { card: centre, cls: styles.fanCenter },
  ];

  return (
    <div className={styles.fanWrap}>
      {slots.map(({ card, cls }) => (
        <div key={card.kind} className={`${styles.fanCard} ${cls}`}>
          <WrappedCard
            eyebrow={card.eyebrow}
            kicker={card.kicker}
            headline={card.headline}
            lede={card.lede}
            body={card.body}
            slug={card.kind === "longestHold" ? "412-days" : card.kind}
            provenance="Read from your brokerage. Read-only, permanently."
            backdrop={backdrop(card.kind)}
            symbol={card.symbol}
            hue={card.hue}
            layout={card.layout}
            rarity={card.rarity}
            example
          />
        </div>
      ))}
    </div>
  );
}
