import { DAY_FILL, type DayState } from "./types";

type SegmentRingProps = {
  /** One entry per trading day — 63 for a quarter. */
  days: DayState[];
  /** Centre readout, e.g. the score. */
  value?: string | number;
  label?: string;
};

/** A quarter's discipline: one arc per trading day, read clockwise from top. */
export function SegmentRing({ days, value, label }: SegmentRingProps) {
  const n = Math.max(days.length, 1);
  const cx = 100;
  const cy = 100;
  const r = 84;
  const step = 360 / n;
  const gap = n > 40 ? 1.9 : 3;
  const stroke = n > 40 ? 6 : 8;

  return (
    <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
      <svg
        viewBox="0 0 200 200"
        width="100%"
        style={{ display: "block", maxWidth: 260 }}
        role="img"
        aria-label={`${days.filter((d) => d === "kept").length} of ${n} days inside your rules`}
      >
        {days.map((state, i) => {
          const a0 = ((i * step - 90 + gap) * Math.PI) / 180;
          const a1 = (((i + 1) * step - 90 - gap) * Math.PI) / 180;
          const x0 = cx + r * Math.cos(a0);
          const y0 = cy + r * Math.sin(a0);
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          return (
            <path
              key={i}
              d={`M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`}
              fill="none"
              stroke={DAY_FILL[state]}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {value != null ? (
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            className="num"
            style={{ fontSize: 52, color: "var(--moss)" }}
          >
            {value}
          </span>
          {label ? <span className="eyebrow">{label}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
