import { Avatar } from "@/components/primitives/Avatar";
import { Teaser } from "@/components/cards/Teaser";
import type { TeaserKind } from "@/components/cards/Teaser";
import type { ArchetypeStanding, Trophy, TrophyGroup } from "@/lib/trophies";
import styles from "./trophyCase.module.css";

/**
 * ── The case ──
 *
 * One band per group, drawn in the same frame grammar as `<Collection>`,
 * because a trophy and a minted card are the same kind of object: a thing the
 * ledger proved, shown as a set so the shape of what is left is visible.
 *
 * **Nothing here is blurred and nothing is sold.** A locked trophy is the same
 * tile at the ground's own weight, stating the one condition that earns it and
 * — where the count is a real subtraction of two things on file — how far
 * along it is. No modal, no tier, no countdown: this is the reader's own
 * history, and the only thing standing between them and a locked row is the
 * history itself.
 *
 * Each band lights in its own hue, which is what makes seventeen near-identical
 * tiles scannable: the eye can tell at a glance which section it is in without
 * reading a heading. The hue reaches the drawing, the numeral and a 3px meter,
 * and stops — it never fills the plate.
 */

const GROUP_TONE: Record<TrophyGroup, string> = {
  streak: "ember",
  record: "accent",
  ledger: "signal",
};

export function TrophyBand({
  title,
  note,
  group,
  trophies,
}: {
  title: string;
  note: string;
  group: TrophyGroup;
  trophies: Trophy[];
}) {
  const earned = trophies.filter((t) => t.earned).length;

  return (
    <section className={styles.band} data-tone={GROUP_TONE[group]} data-reveal>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>{title}</p>
          <p className={styles.note}>{note}</p>
        </div>
        <p className={styles.tally}>
          <span className="num">{earned}</span> of {trophies.length}
        </p>
      </div>

      <ul className={styles.grid}>
        {trophies.map((trophy, i) => (
          <li
            key={trophy.key}
            className={styles.frame}
            data-earned={trophy.earned || undefined}
            /* Capped so a longer roster never slows the last tile down. */
            style={{ animationDelay: `${Math.min(i * 28, 300)}ms` }}
          >
            <span className={styles.art} aria-hidden="true">
              <Teaser kind={trophy.teaser as TeaserKind} />
            </span>
            <span className={styles.name}>{trophy.name}</span>
            {/*
              * The condition, worded identically whether it is earned or not.
              * A row that swapped to "unlocked" would hide what the thing
              * actually was at exactly the moment somebody wants to say it out
              * loud.
              */}
            <span className={styles.need}>{trophy.requires}</span>

            {/*
              * The meter is a real subtraction — days on file, round trips
              * closed — and it is absent on anything that is a single event,
              * where a bar at zero would be a drawn figure saying nothing.
              */}
            {trophy.progress && !trophy.earned ? (
              <span className={styles.meter}>
                <span
                  className={styles.fill}
                  style={{ transform: `scaleX(${trophy.progress.have / trophy.progress.need})` }}
                />
                <span className={`num ${styles.count}`}>
                  {trophy.progress.have} / {trophy.progress.need}
                </span>
              </span>
            ) : null}

            {/*
              * Every tile says where it stands in the same slot. An earned one
              * says so; an unearned one with a real count is already saying it
              * in the meter above; and one that is a single event — where a
              * pair would be "0 of 1" and say less than its own condition —
              * says "Not yet", because a foot left empty on some tiles and
              * filled on others reads as a tile that failed to render.
              */}
            {trophy.earned ? (
              <span className={styles.won}>Earned</span>
            ) : trophy.progress ? null : (
              <span className={styles.waiting}>Not yet</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * ── The sixteen ──
 *
 * Which of the archetypes this account has actually been. It is a set and not
 * a scoreboard: no corner of the cube is better than another, the count beside
 * each is how many nights read that way, and an archetype never inhabited is
 * present at the ground's own weight rather than hidden.
 *
 * The character is the drawing, at the size it was drawn to be read at. A
 * never-inhabited one is the same character with the light off — `data-lit`
 * is the whole difference, because the shape is the identity and greying it
 * out entirely would make sixteen tiles read as fifteen empties.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A stored `YYYY-MM-DD` as a short human date, sliced rather than parsed.
 *
 * `new Date("2026-01-09")` is UTC midnight and prints as the eighth in every
 * timezone west of Greenwich, which would date a trophy to the day before the
 * night that earned it. The string already holds the fields; nothing needs to
 * become a moment in time to be read back.
 */
function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  if (!name) return iso;
  return `${Number(day)} ${name} ${year}`;
}

export function ArchetypeSet({ standings }: { standings: ArchetypeStanding[] }) {
  const lit = standings.filter((s) => s.days > 0).length;

  return (
    <section className={styles.band} data-tone="accent" data-reveal>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>The sixteen</p>
          <p className={styles.note}>
            Four parts, each above the bar or not — sixteen profiles, and no seventeenth. These
            are the ones your nights have read as.
          </p>
        </div>
        <p className={styles.tally}>
          <span className="num">{lit}</span> of {standings.length}
        </p>
      </div>

      <ul className={styles.faces}>
        {standings.map((standing, i) => (
          <li
            key={standing.key}
            className={styles.face}
            data-lit={standing.days > 0 || undefined}
            style={{ animationDelay: `${Math.min(i * 24, 300)}ms` }}
          >
            <span className={styles.portrait}>
              <Avatar archetype={standing.key} size="var(--face-size, 72px)" />
            </span>
            <span className={styles.faceName}>{standing.name}</span>
            <span className={styles.faceMeta}>
              {standing.days > 0 && standing.firstOn
                ? `${standing.days} ${standing.days === 1 ? "night" : "nights"} · since ${shortDate(standing.firstOn)}`
                : "Not yet"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
