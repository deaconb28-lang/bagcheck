/**
 * The demo series behind the landing wave.
 *
 * Seeded, not Math.random(): the silhouette has to be byte-identical on the
 * server and the client or React hydrates into a mismatch. An LCG at seed 7 is
 * the same walk the reference render used.
 */
export interface DemoBar {
  day: number;
  win: boolean;
  /** 0–100, the bar's share of the half-height. */
  pct: number;
  label: string;
}

export function demoWave(days = 63, seed = 7): DemoBar[] {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;

  const out: DemoBar[] = [];
  for (let i = 0; i < days; i += 1) {
    const win = rnd() > 0.35;
    const mag = Math.pow(rnd(), 1.7);
    const pct = Math.round(mag * 92) + 6;
    out.push({
      day: i + 1,
      win,
      pct,
      label: `Day ${i + 1} · ${win ? "+" : "−"}${(mag * 3.4 + 0.1).toFixed(2)}%`,
    });
  }
  return out;
}

export function waveCounts(bars: DemoBar[]): { green: number; red: number } {
  return {
    green: bars.filter((b) => b.win).length,
    red: bars.filter((b) => !b.win).length,
  };
}
