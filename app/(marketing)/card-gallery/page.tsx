import { WrappedCard } from "@/components/cards/WrappedCard";
import { buildCards } from "@/lib/cards/kinds";
import { exampleLedger } from "../exampleLedger";



export default function Gallery() {
  const cards = buildCards(exampleLedger(2026));
  return (
    <div style={{ background: "#0b0a08", padding: 40, display: "grid", gridTemplateColumns: "repeat(4, 400px)", gap: 28, justifyContent: "center" }}>
      {cards.map((c) => (
        <WrappedCard
          key={c.kind}
          eyebrow={c.eyebrow}
          kicker={c.kicker}
          headline={c.headline}
          lede={c.lede}
          body={c.body}
          slug={c.kind}
          provenance="Read from your brokerage. Read-only, permanently."
          backdrop={`/cards/${c.kind}.png`}
          hue={c.hue}
          rarity={c.rarity}
          example
        />
      ))}
    </div>
  );
}
