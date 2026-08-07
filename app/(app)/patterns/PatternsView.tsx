import { Card, Eyebrow } from "@/components/primitives";
import type { Finding } from "@/lib/engine";
import styles from "./patterns.module.css";

/**
 * Layer 4 on screen. One finding per card: the category, the sentence, and
 * the counts it rests on. No ranking, no advice, no call to action — the
 * product names what happened and stops there.
 */
export function PatternsView({
  findings,
  missing,
}: {
  findings: Finding[];
  missing: string;
}) {
  if (!findings.length) {
    return (
      <Card>
        <div className={styles.block}>
          <h2 className={`disp ${styles.h2}`}>Still listening</h2>
          <p className={styles.body}>{missing}</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {findings.map((f) => (
        <Card key={f.key}>
          <div className={styles.block}>
            <Eyebrow>{f.tag}</Eyebrow>
            <p className={styles.finding} data-tone={f.tone}>
              {f.sentence}
            </p>
            <p className={styles.evidence}>{f.evidence}</p>
          </div>
        </Card>
      ))}
      <Card sunken>
        <div className={styles.block}>
          <Eyebrow>Still listening</Eyebrow>
          <p className={styles.body}>{missing}</p>
        </div>
      </Card>
    </>
  );
}
