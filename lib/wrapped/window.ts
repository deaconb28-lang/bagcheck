/**
 * The slice of time a deck is cut to.
 *
 * Wrapped was annual and only annual, which is the wrong shape for all but one
 * month of the year: a reader who connects in March is told their year has not
 * happened yet, and is right, and can do nothing about it until December. A
 * quarter is a window a new account can actually fill — and a year is just the
 * window that happens to be four of them.
 *
 * Pure, and the whole vocabulary lives here: the key that goes in a URL and in
 * the cache, the label the screen prints, and the two dates every figure is
 * filtered by. `to` is exclusive, because a quarter ends where the next begins
 * and a date string comparison has no notion of "the last instant of March".
 */

export interface WrappedWindow {
  /** `year`, or `q1`…`q4`. Goes in the URL and in the cache key. */
  key: string;
  /** What the screen calls it: "2026" or "Q3 2026". */
  label: string;
  /** Inclusive. */
  from: string;
  /** Exclusive. */
  to: string;
  quarter: number | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The whole year, which is the default and the only window a finished year needs. */
export function yearWindow(year: number): WrappedWindow {
  return {
    key: "year",
    label: String(year),
    from: `${year}-01-01`,
    to: `${year + 1}-01-01`,
    quarter: null,
  };
}

export function quarterWindow(year: number, quarter: number): WrappedWindow {
  const startMonth = (quarter - 1) * 3 + 1;
  return {
    key: `q${quarter}`,
    label: `Q${quarter} ${year}`,
    from: `${year}-${pad(startMonth)}-01`,
    to: quarter === 4 ? `${year + 1}-01-01` : `${year}-${pad(startMonth + 3)}-01`,
    quarter,
  };
}

/** Which quarter a date falls in, 1–4. */
export function quarterOf(date: Date): number {
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

/**
 * The windows a reader may ask for, in the order the screen offers them.
 *
 * A quarter that has not started yet is not offered — an empty deck for a
 * window that cannot possibly hold anything is a dead end with a date on it.
 * The year comes first because it is the default and because, once a year is
 * complete, it is the one anybody wants.
 */
export function windowsFor(year: number, now: Date): WrappedWindow[] {
  const sameYear = now.getUTCFullYear() === year;
  const last = sameYear ? quarterOf(now) : 4;
  const quarters = [];
  for (let q = 1; q <= last; q += 1) quarters.push(quarterWindow(year, q));
  return [yearWindow(year), ...quarters];
}

/**
 * Resolve a URL parameter to a window, falling back to the year.
 *
 * A key naming a quarter that has not begun resolves to the year rather than
 * to an empty deck: a link minted in December and opened in January of the
 * next year would otherwise show a window with nothing in it and no
 * explanation.
 */
export function windowFor(year: number, key: string | undefined, now: Date): WrappedWindow {
  const match = /^q([1-4])$/.exec(key ?? "");
  if (!match) return yearWindow(year);
  const quarter = Number(match[1]);
  const available = windowsFor(year, now).some((w) => w.key === `q${quarter}`);
  return available ? quarterWindow(year, quarter) : yearWindow(year);
}
