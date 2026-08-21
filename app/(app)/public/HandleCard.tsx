import { SupercruiseMark } from "@/components/brand/SupercruiseMark";
import styles from "./public.module.css";

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/**
 * ── The name, as an object ──
 *
 * A handle is the one thing on this screen a person can own, so it is drawn as
 * a thing rather than announced as a setting: a card with the name across it
 * and its facts stamped in the corners, the way an ID card or a membership
 * card states them.
 *
 * The four corners are the whole of what a public ledger is, and none of them
 * is a figure: what the card is, when it was reserved, that there is exactly
 * one of each name, and the address a stranger would type. **No number about
 * an account appears here** — this page is reachable by anyone with the link,
 * and the rule for it is the same as `/@handle`'s: nothing on it can be
 * learned about somebody's money.
 *
 * The gradient is the one saturated fill in the app and it is an artefact's
 * palette rather than the instrument's — the same exemption a share card has,
 * for the same reason. It is an object you are meant to want.
 */
export function HandleCard({ handle, at }: { handle: string | null; at: Date }) {
  const name = handle ?? "yourname";

  return (
    <div className={styles.card} data-unclaimed={handle ? undefined : ""}>
      <div className={styles.cardGrain} aria-hidden="true" />

      <div className={styles.cardTop}>
        <span className={styles.cardBrand}>
          <SupercruiseMark size={22} />
          supercruise
        </span>
        <span className={styles.cardStamp}>
          {MONTHS[at.getUTCMonth()]} / {at.getUTCFullYear()}
        </span>
      </div>

      <p className={styles.cardName}>
        <span aria-hidden="true">@</span>
        {name}
      </p>

      <div className={styles.cardFoot}>
        <span className={styles.cardStamp}>
          PUBLIC LEDGER
          <br />
          WEIGHTS &amp; RETURNS
        </span>
        <span className={styles.cardStamp} data-right="">
          ONE OF ONE
          <br />
          supercruise.app/@{name}
        </span>
      </div>
    </div>
  );
}
