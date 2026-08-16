import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cardBySlug, isDbConfigured } from "@/lib/db";
import { stripCells } from "@/lib/cards";
import { Button, Logo } from "@/components/primitives";
import styles from "./card.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** The unfurl. Without these the whole share loop is just a link. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const card = isDbConfigured() ? await cardBySlug(slug) : null;
  if (!card) return { title: "Bagcheck" };

  const title = `${card.value} — ${card.tail}`;
  const image = `/og/${slug}`;
  return {
    title: `${title} · Bagcheck`,
    description: "Read-only brokerage data behind every number.",
    openGraph: {
      title,
      description: "Read-only brokerage data behind every number.",
      images: [{ url: image, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default async function CardPage({ params }: Props) {
  const { slug } = await params;
  const card = isDbConfigured() ? await cardBySlug(slug) : null;
  if (!card) notFound();

  const cells = stripCells(card.slug);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <article className={styles.card} data-tone={card.tone}>
          {/*
            * The kind's fixed artwork — the same one every card of this kind
            * wears, the way a Wrapped template is designed once and worn by
            * millions. What is this person's own is the figure and the
            * company set over it.
            */}
          {card.type ? (
            <img className={styles.art} src={`/cards/${card.type}.jpg`} alt="" aria-hidden="true" />
          ) : null}
          <div className={styles.top}>
            <span className={styles.mark}>
              <Logo symbol={card.symbol} size={30} />
              <span className={styles.label}>{card.label}</span>
            </span>
            {card.rarity ? <span className={styles.rarity}>{card.rarity}</span> : null}
          </div>
          <div className={styles.body}>
            <span
              className={card.value.length <= 4 ? styles.value : styles.valueText}
            >
              {card.value}
            </span>
            <p className={styles.tail}>{card.tail}</p>
          </div>
          <div className={styles.strip} aria-hidden="true">
            {cells.map((c, i) => (
              <i key={i} className={styles.cell} data-c={c} />
            ))}
          </div>
          <div className={styles.foot}>
            <span className={styles.url}>bagcheck.app/c/{card.slug}</span>
            <span className={styles.verified}>verified</span>
          </div>
        </article>

        <div className={styles.aside}>
          <h1 className={`disp ${styles.h1}`}>
            This came from a brokerage, not a screenshot
          </h1>
          <p className={styles.lede}>
            Bagcheck reads a read-only connection to the account behind this
            number. It measures behaviour — hold time, sizing, what someone does
            in a drawdown — and it never places a trade.
          </p>
          <Button marketing href="/">
            Get yours
          </Button>
          <p className={styles.meta}>Minted {card.date} · read-only, permanently</p>
        </div>
      </div>
    </main>
  );
}
