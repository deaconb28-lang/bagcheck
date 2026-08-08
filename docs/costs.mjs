// Unit economics. Every input is a stated price, not a guess.
const STRIPE = (p) => p - (p * 0.029 + 0.30);          // US card, standard
const netPlus = STRIPE(9), netTrader = STRIPE(29);

/*
 * Anthropic A1 (the daily insight): ~700 in / ~400 out per user per day.
 *
 * There is no cached row. Caching the system prompt was the obvious saving
 * and it is not available: SYSTEM_PROMPT measures ~1.3k characters, roughly
 * 450 tokens on Sonnet 5's tokenizer, and Sonnet 5's minimum cacheable prefix
 * is 1024 tokens. A marker there is a silent no-op, not an error. Two further
 * reasons it would not have paid off even at length: only the ~450-token
 * system half of the 700 input tokens is stable, and the default cache TTL is
 * five minutes against one call per user per day.
 */
const insight = (inM, outM) => (700 * inM + 400 * outM) / 1e6 * 30;
const A1 = {
  opus:        insight(5, 25),
  sonnet:      insight(3, 15),
  sonnetIntro: insight(2, 10),
};

const scales = [1000, 10000, 50000];
const fixed = (n) => {
  const mongo = n <= 2000 ? 57 : n <= 20000 ? 390 : 1200;   // M10 / M30 / M50-ish
  const finnhub = 100;                                       // Premium, commercial licence
  const logodev = n <= 5000 ? 33.33 : 150;
  const vercel = n <= 5000 ? 20 : n <= 20000 ? 150 : 500;
  return { mongo, finnhub, logodev, vercel, total: mongo + finnhub + logodev + vercel };
};

const variable = (a1) => ({ snaptrade: 1.00, a1, wrapped: 0.02, total: 1.00 + a1 + 0.02 });

// 80/20 Plus/Trader mix
const arppu = 0.8 * netPlus + 0.2 * netTrader;

console.log(`net per Plus $${netPlus.toFixed(2)} · net per Trader $${netTrader.toFixed(2)} · blended ARPPU $${arppu.toFixed(2)}\n`);
console.log("A1 monthly per user:", Object.entries(A1).map(([k,v])=>`${k} $${v.toFixed(3)}`).join(" · "), "\n");

for (const model of ["opus", "sonnet"]) {
  const v = variable(A1[model]);
  console.log(`── A1 on ${model}: variable $${v.total.toFixed(2)}/user/mo`);
  for (const n of scales) {
    const f = fixed(n);
    const cost = n * v.total + f.total;
    const be = cost / (n * arppu);
    console.log(`   ${String(n).padStart(6)} users → cost $${Math.round(cost).toLocaleString().padStart(8)}/mo  (fixed $${f.total})  break-even ${(be*100).toFixed(1)}%  = ${Math.ceil(n*be).toLocaleString()} payers`);
  }
  console.log();
}

// The dormancy lever: SnapTrade bills connected users.
console.log("── Disconnecting dormant users (SnapTrade bills connected users only)");
for (const dormant of [0, 0.3, 0.5]) {
  const v = 1.00 * (1 - dormant) + A1.sonnet + 0.02;
  const n = 10000, f = fixed(n);
  const cost = n * v + f.total;
  console.log(`   ${(dormant*100).toFixed(0)}% dormant → $${v.toFixed(2)}/user  cost $${Math.round(cost).toLocaleString()}/mo  break-even ${(cost/(n*arppu)*100).toFixed(1)}%`);
}

/*
 * The lever table in the doc. Every row is computed here so §5 can be
 * regenerated rather than hand-maintained — three of its numbers had drifted
 * out of step with this file before it was.
 *
 * Each lever states its own SnapTrade rate, dormancy share and price pair;
 * break-even is always measured at 10,000 users.
 */
const N = 10000, FIXED = fixed(N).total;
const breakEven = ({ rate = 1.00, dormant = 0, plus = 9, trader = 29, a1 = A1.sonnet }) => {
  const perUser = rate * (1 - dormant) + a1 + 0.02;
  const rev = 0.8 * STRIPE(plus) + 0.2 * STRIPE(trader);
  return { be: (N * perUser + FIXED) / (N * rev), perUser, rev };
};

const levers = [
  ["Nothing changes (insight on Sonnet 5)",        {}],
  ["Insight left on Opus 5",                       { a1: A1.opus }],
  ["Disconnect dormant users at 60 days (30%)",    { dormant: 0.30 }],
  ["Trial-then-connect (≈70% never stay connected)", { dormant: 0.70 }],
  ["SnapTrade volume rate at $0.50",               { rate: 0.50 }],
  ["Raise to $12 / $39",                           { plus: 12, trader: 39 }],
  ["Dormancy + volume rate + $12 entry",           { rate: 0.50, dormant: 0.30, plus: 12, trader: 39 }],
];

console.log("\n── Levers, break-even at 10,000 users");
for (const [label, opts] of levers) {
  const { be, perUser, rev } = breakEven(opts);
  console.log(`   ${label.padEnd(48)} $${perUser.toFixed(2)}/user  ARPPU $${rev.toFixed(2)}  break-even ${(be * 100).toFixed(1)}%`);
}
