"use client";

import { useState } from "react";
import { Logo } from "@/components/primitives";
import { ShareButton } from "@/components/app/ShareButton";
import { can } from "@/lib/tiers";
import type { Tier } from "@/lib/tiers";
import type { ActivityRow } from "@/lib/db";
import type { WaveDay } from "@/components/idioms";
import screen from "../screen.module.css";
import styles from "./ledger.module.css";

type Toggle = {
  key: string;
  name: string;
  /** What this actually exposes, named plainly. */
  note: string;
  gated?: boolean;
};

const TOGGLES: Toggle[] = [
  { key: "score", name: "Health score", note: "Your current number and its weekly direction." },
  { key: "archetype", name: "Archetype", note: "The word, not the components behind it." },
  { key: "streak", name: "Streak", note: "Consecutive sessions inside your own rules." },
  { key: "wave", name: "P&L shape", note: "The shape of your sessions. Never the amounts." },
  {
    key: "verified",
    name: "Verified badge",
    note: "An attestation that the numbers came from a read-only brokerage link.",
    gated: true,
  },
];

const money = (v: number | null, c: string | null) =>
  v == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD", maximumFractionDigits: 0 }).format(Math.abs(v));

const KIND_OF = (type: string | null): string => {
  const t = (type ?? "").toLowerCase();
  if (t.includes("buy")) return "BUY";
  if (t.includes("sell")) return "SELL";
  if (t.includes("dividend")) return "DIV";
  if (t.includes("contribution") || t.includes("deposit")) return "XFER";
  if (t.includes("withdraw")) return "XFER";
  return "OTHER";
};

/**
 * The public profile.
 *
 * The preview is what a visitor sees, rendered on the ink field exactly as
 * they would get it — a settings screen that describes what it exposes is
 * worse than one that shows it.
 */
export function LedgerView({
  rows,
  kinds,
  total,
  tier,
  score,
  archetype,
  streak,
  wave,
  scoredDays,
}: {
  rows: ActivityRow[];
  kinds: Array<{ kind: string; count: number }>;
  total: number;
  tier: Tier;
  score: number | null;
  archetype: { name: string; line: string };
  streak: number;
  wave: WaveDay[];
  scoredDays: number;
}) {
  const [on, setOn] = useState<Record<string, boolean>>({
    score: true,
    archetype: true,
    streak: true,
    wave: false,
    verified: false,
  });

  const peak = wave.reduce((m, d) => Math.max(m, Math.abs(d.amount)), 0) || 1;

  const publicStats = [
    on.score && score != null ? { label: "Health", value: String(score), tone: "moss" } : null,
    on.archetype ? { label: "Archetype", value: archetype.name.replace("The ", ""), tone: "ink" } : null,
    on.streak ? { label: "Streak", value: `${streak}d`, tone: "moss" } : null,
    { label: "Scored days", value: String(scoredDays), tone: "ink" },
  ].filter(Boolean) as Array<{ label: string; value: string; tone: string }>;

  return (
    <div className={screen.body}>
      <div className={screen.grid}>
        <div className={screen.column}>
          <section data-reveal className={`${screen.panel} ${screen.hero}`}>
            <div className={screen.head}>
              <div className={screen.headText}>
                <span className={screen.eyebrow}>Your public page</span>
                <div className={`disp ${screen.h2}`}>What a visitor sees</div>
              </div>
              <ShareButton type="health" label="your public page" size={34} />
            </div>

            <div className={styles.preview}>
              <div className={styles.previewStats}>
                {publicStats.map((s) => (
                  <div key={s.label} className={styles.previewStat}>
                    <span className={styles.previewLabel}>{s.label}</span>
                    <span className={`num ${styles.previewValue}`} data-tone={s.tone}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              {on.wave && wave.length > 1 ? (
                <div className={styles.miniWave} aria-hidden="true">
                  {wave.map((d) => (
                    <i
                      key={d.date}
                      data-dir={d.amount >= 0 ? "up" : "down"}
                      style={{ height: `${Math.max(6, (Math.abs(d.amount) / peak) * 100)}%` }}
                    />
                  ))}
                </div>
              ) : null}

              <div className={styles.previewFoot}>
                <span>bagcheck.app/you</span>
                {on.verified && can({ tier }, "verifiedTrackRecord") ? (
                  <span className={styles.verified}>verified</span>
                ) : null}
              </div>
            </div>
          </section>

          <section data-reveal className={screen.panel} style={{ animationDelay: "0.04s" }}>
            <div className={`disp ${screen.h2}`}>What is public</div>
            <div className={styles.toggles}>
              {TOGGLES.map((t) => {
                const locked = t.gated && !can({ tier }, "verifiedTrackRecord");
                return (
                  <div key={t.key} className={styles.toggleRow}>
                    <div className={styles.toggleText}>
                      <span className={styles.toggleName}>{t.name}</span>
                      <span className={styles.toggleNote}>{t.note}</span>
                    </div>
                    {locked ? <span className={styles.gate}>Trader</span> : null}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(on[t.key]) && !locked}
                      aria-label={t.name}
                      disabled={locked}
                      className={styles.switch}
                      onClick={() => setOn((p) => ({ ...p, [t.key]: !p[t.key] }))}
                    >
                      <i />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className={screen.rail}>
          <div className={screen.panel}>
            <span className={screen.eyebrow}>Raw ledger · {total.toLocaleString("en-US")} entries</span>
            <div className={styles.rows}>
              {rows.slice(0, 12).map((row) => (
                <div key={row.externalId} className={styles.row}>
                  <span className={styles.kind} data-kind={KIND_OF(row.type)}>
                    {KIND_OF(row.type)}
                  </span>
                  <Logo symbol={row.symbol} size={22} />
                  <span className={styles.sym}>{row.symbol ?? "—"}</span>
                  <span className={styles.date}>{row.date?.slice(5, 10) ?? "—"}</span>
                  <span className={styles.amt}>{money(row.amount, row.currency)}</span>
                </div>
              ))}
            </div>
            <p className={screen.tail}>
              Read-only. Bagcheck can see what you did and cannot place, cancel or
              modify an order.
            </p>
          </div>

          <div className={screen.panel}>
            <span className={screen.eyebrow}>By kind</span>
            <div className={screen.chips}>
              {kinds.map((k) => (
                <span key={k.kind} className={screen.chip}>
                  {k.kind} <span className={screen.chipNum}>{k.count}</span>
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
