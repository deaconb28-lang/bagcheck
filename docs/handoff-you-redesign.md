# Handoff — redesign `/you`

> **Done.** This brief has been built; the paragraphs in `CLAUDE.md` about
> `/you`, the field, the weight ramp and `lib/returns.ts` are the current
> description of the screen and take precedence over anything below. Kept as
> the record of what was asked for and why.
>
> **§5, the one open question, resolved as option 2.** There is still no
> hedge-fund index and no key for one, so nothing is labelled "hedge funds" in
> the aggregate. The field is five real funds quoted by ticker through the
> provider already in the repo — `DBMF`, `QAI`, `MNA`, `BTAL` and `SPY` — four
> of which exist to replicate hedge-fund strategies. Every figure is checkable
> and nothing is invented; a fund the provider will not quote is dropped rather
> than drawn at zero.
>
> One thing found while building it that is **not fixed and is not mine**:
> `dailyPnlFrom` in `lib/db/derived.ts` sums each sell's *cash amount*, so
> `derived.dailyPnl[].realised` is gross proceeds rather than realised P&L.
> Everything reading that series — the dashboard's headline P&L chart and
> Wrapped — overstates. The new "Realised in {year}" figure sidesteps it by
> summing `derived.roundTrips[].pnl` instead. Fixing the series itself means
> changing what Wrapped's cards say and bumping `DERIVED_VERSION`.

**Branch:** `claude/supercruise-build-instructions-b97o06` (the repo's only branch; both
deployments build from it)
**Head at handoff:** `3c88615`
**Repo:** `deaconb28-lang/supercruise` · product is named **Canopy**; the Mongo
database is still `supercruise` on purpose (a database name is an address, not a
brand).

---

## 1 · The task

Redesign `/you` completely. The verdict on the current build, verbatim:

> It is austere, boring, blank, uses no motion, poorly designed, and gives 0
> value to the user.

### The block order asked for, top to bottom

| # | Block | Notes from the brief |
|---|---|---|
| 1 | **P&L chart, last 30 trading days** | Top of the page, beside → |
| 2 | **Pie chart of holdings** | Side by side with the P&L chart |
| 3 | **Basic stats** | Portfolio amount, positions in profit, return from cost basis, YTD return, etc. |
| 4 | **"Racing against hedge funds" YTD** | A **moving** bar-graph race, animated |
| 5 | **Wrapped** | Plus a **"Go to Wrapped" button at the top of the page** |
| 6 | **Insights and patterns** | |
| 7 | **Archetype** | Last |

Two standing instructions that cut across all of it:

- **Devote more space to performance.** Performance is the point of the screen;
  it should dominate.
- **Motion.** The current screen has effectively none. The brief calls this out
  explicitly and asks for a *moving* graph in block 4.

### What "more space to performance" implies

Blocks 1–4 are all performance. That is most of the page before Wrapped. The
current build spends its top third on one figure and one flat bar chart, then
drops into identity material. Invert that weighting.

---

## 2 · Where the current `/you` is

`app/(app)/you/page.tsx` — a server component, `force-dynamic`. Eleven blocks
in this order today: money (`#money`), portfolio, the read (`#read`), the year
(`<YearBlock>`), holdings, identity, consistency (`#consistency`), findings, the
tag loop, minted cards (`#cards`), paid formats.

Supporting files:

```
app/(app)/you/page.tsx              the screen
app/(app)/you/you.module.css        its styles
app/(app)/you/YearBlock.tsx         the Wrapped pile (server component)
app/(app)/you/year-block.module.css
app/(app)/derive.ts                 pure screen derivations
app/(app)/screen.module.css         .body / .grid / .panel / .eyebrow etc.
components/app/ScreenHeader.tsx     the one row of chrome
components/idioms/                  ZeroBarChart, EquityCurve, HeatGrid, ScoreRing
```

**There is no desktop rail any more.** It was removed this session — 220px of
column holding one tab. The mark, avatar and `<ModeSwitch>` are in
`<ScreenHeader>`. Below 900px `MobileTabs` survives with two tabs. Don't
reintroduce a rail.

---

## 3 · What data you already have (do not re-derive)

`loadScreen(userId, 400)` returns `ScreenData`:

```ts
holdings: HoldingRow[]          // symbol, units, value, costBasis, mark…
derived: DerivedDoc | null      // ← the important one
scores: ScoreDoc[]              // one per day, backfilled across the ledger
tier, mode, tagged, taggable
investorAge: number | null
connection: { accounts[], lastSyncAt }
transactionCount: number
```

`derived` (materialised once per sync in `lib/db/derived.ts` — **screens read it,
they never scan**):

```ts
roundTrips: RoundTrip[]         // symbol, openDate, closeDate, holdDays, pnl, notional
dailyPnl: { date, realised }[]  // ← block 1 comes from here
equitySeries: { date, value, interpolated }[]   // ← YTD return, the race
holdTime: { winnersMean, losersMean, winners, losers }
excludedSymbols: string[]
findings: { key, tag, sentence, evidence, tone, impact }[]  // ← block 6
```

Pure helpers in `app/(app)/derive.ts`: `dailyPnl`, `waveSummary`, `heatFromScores`,
`currentStreak`, `longestStreak`, `archetypeOf`, `weekDelta`, `weeklySessions`,
`sessionRecap`.

### For the new blocks specifically

- **Block 1 (30 trading days)** — `derived.dailyPnl.slice(-30)`. The existing
  component is `<ZeroBarChart>`; it now positions its zero line from the data
  (floor when every session is green, ceiling when every one is red) instead of
  always centring.
- **Block 2 (holdings pie)** — `data.holdings` has `value` per position. For
  sector slices, `profilesFor(symbols)` in `lib/market` returns `.industry`;
  it needs `FINNHUB_API_KEY` and returns an empty map without one, so the pie
  must fall back to per-symbol slices. Company marks render through `<Logo>`
  (`/api/logo/[symbol]`), which works keylessly.
- **Block 3 (stats)** — portfolio value and cost basis are on `holdings`;
  positions-in-profit is a count over them; YTD return comes off
  `derived.equitySeries` (first point of the year vs latest).
- **Block 4 (the race)** — `indexReturnYtd()` in `lib/market/benchmark.ts`
  returns SPY's YTD as a fraction, cached 6h, `null` without a market key.
  **There is no hedge-fund return series in this repo.** See §5.
- **Block 6 (insights/patterns)** — `derived.findings` is already computed and
  self-silencing (below its sample floor a finding returns `null` rather than
  reporting a coincidence). Tag-joined findings are computed live because tags
  move without a sync.
- **Block 7 (archetype)** — `archetypeFor(components)` in `lib/archetypes.ts`,
  sixteen corners of a four-bit cube. Avatars are drawn in `lib/avatars/drawn.ts`.

---

## 4 · Wrapped is done and wired — reuse it, don't rebuild it

The twelve-card Wrapped pipeline landed this session and both `/wrapped` and the
dashboard render from it.

- `wrappedDeck(userId, year)` in `lib/wrapped/year.ts` is the single loader.
  It returns `ShownCard[]` — each a **complete 1080×1920 HTML document**, already
  through `cardDocument()` (stylesheet inlined, hero fitted).
- `<YearBlock>` on `/you` renders them as a **pile** (top card readable, three
  behind as depth) linking to `/wrapped`. `<YearDeck>` on `/wrapped` is the same
  pile, swipeable.
- Cards are framed in `<iframe srcDoc>`, never re-implemented — a card has its
  own stylesheet, faces and palette.

**Hard rule from the user, stated twice:** *Wrapped is never a gallery, only a
stacked swipeable deck.* Do not lay the cards out side by side.

`<CardFonts>` must be rendered on any page that frames a card — it preloads the
four faces the card documents ask for. Without it the cards paint their art
before their type.

The brief also asks for a **"Go to Wrapped" button at the top of the page**.
That is new; the only door today is the year block itself.

---

## 5 · The hedge-fund race — the one honest problem

The brief asks for the user "racing against hedge funds YTD". **This repo has no
hedge-fund performance data and no source for it.** What exists is
`indexReturnYtd()` (SPY, via Finnhub).

This matters because of a rule the codebase enforces everywhere:

> Nothing here invents anything. Where the ledger cannot answer, the function
> returns an empty result rather than a plausible one. A locked tile carries
> readiness computed from real sample counts; never fake a Ready.

So a bar labelled "Hedge funds: +14.2%" with a hardcoded number would be exactly
the thing this product must not print — on the screen whose whole claim is that
its figures came off a brokerage.

**Resolve this before building block 4.** Options, in the order I'd rank them:

1. **Race the index and say so.** SPY YTD is real, already fetched and cached.
   The bar chart, the motion and the "you vs. them" framing all survive; only
   the label changes. Card 10 of Wrapped already does exactly this comparison.
2. **Add a real source** for a hedge-fund composite (e.g. an HFR/Barclay index
   via an API) and render it with `provenanceLine`, the way market data is
   already attributed.
3. **Ask the user** which they want — this is a one-question decision and it
   changes what block 4 *is*.

Do not ship invented benchmark figures.

---

## 6 · Design constraints that will bite you

Read `CLAUDE.md` before touching anything visual. The ones most relevant here:

- **`styles/tokens.css` is the only place a palette hex may live** inside `app/`,
  `components/`, `lib/`, `styles/`. Always `var(--*)`; for alpha,
  `color-mix(in srgb, var(--token) N%, transparent)`.
- **Hue carries meaning, never variety.** `--moss` = money up and nothing else.
  `--loss` = negative P&L and nothing else. `--signal` = exposure/comparison/
  percentile. `--ember` = streaks, records, scarcity, live. `--accent` (violet) =
  **reserved for Canopy's own reading** — the score, the written insight, the
  consistency ramp, Wrapped identity, Investor Age. A pie chart of holdings is
  *exposure*, so its slices are `--signal` steps, not a rainbow.
  I cut nine violet eyebrows to three this session for exactly this reason;
  don't put it back.
- **A hue never fills a surface, never paints chrome, never marks a hover.**
- **A stat is not a box.** Eyebrow → number → 3px meter → tail, as a plain column
  in a `gap` grid. Four small filled rectangles inside a big one is the tell.
- **Air is the point:** 48px page padding, 40px panel padding, 96px between
  blocks on the dashboard, 140px at the foot. Everything on a 4px base.
- **Radii are large:** 40 hero, 32 panel, 28 card-in-grid, 26 tiles, 18 rows,
  14 buttons, 12 controls, 999 pills.
- **The dashboard measure is 1240px**, set via `--measure` on `.wide` and read by
  `.grid` in `screen.module.css`. (It was two competing `max-width` declarations
  in two CSS modules, tied on specificity, and the dashboard had been silently
  rendering at the 820px *reading* measure. Fixed in `260611f`.)
- **Copy rules, enforced in review:** descriptive never prescriptive; no "you
  should"; no exclamation marks; sentence case; buttons name what happens.
  Numbers describe behaviour, never a benchmark and never another person —
  *except* in explicit percentile surfaces, which are `--signal`. Block 4 is
  such a surface.

### On motion — the brief's main complaint

`CLAUDE.md` already permits more than the screen currently uses:

- Meters `scaleX` 800ms staggered 70ms; wave bars `scaleY` staggered 8ms so a
  chart draws left to right.
- Count-ups on `setInterval` — **the real value must be the default render**, so
  if the tween never starts the number on screen is still correct.
- Scroll-driven reveals via `data-reveal` + the `rise` keyframe, retargeted onto
  scroll position where supported. Content above the fold is past its range at
  load, so it is simply there.
- Arrivals staggered oldest-first, under 300ms total. Ease-out, nothing over
  500ms for arrivals. Ambient loops are allowed only behind live data and on
  marketing surfaces.
- **Everything honours `prefers-reduced-motion`**, and JS tweens check
  `matchMedia` before starting. **The static state must be the finished design.**

The race in block 4 is the one place a longer, deliberately animated sequence is
justified — it is the screen's set piece.

### Where new visual patterns go

`components/idioms` is a **closed set** — an idiom with no surface gets deleted,
not kept warm. A pie/donut and a race chart would be new members. Build them
there, pure and token-driven, not inline in the page.

---

## 7 · How to verify (this is the part that saves you)

```bash
npm run typecheck && npm run lint && npm test     # 337 tests today
npm run build
npm run shots                                      # ← the important one
```

`npm run shots` (`scripts/shots.mjs`) seeds an in-memory Mongo with a synthetic
14-month ledger, boots `next start` on port 3123 against it, and walks every
route at **1440 / 1024 / 390**, app screens in **both modes**, running overflow
and contrast probes on each. Output lands in `.shots/` (gitignored). The seed
calls the app's own `backfillScores` and `rebuildDerived`, so every figure on
screen is computed by production code.

**Read the screenshots.** Three of the four real bugs I fixed this session were
invisible to typecheck, lint, tests *and* the build, and only a rendered pixel
caught them.

### Landmines I hit — don't repeat these

- **Run build and shots strictly serially.** I lost two cycles to a background
  `next build` rewriting `.next` while `next start` was reading it. Symptom:
  "Could not find a production build", or a sweep that silently shoots the
  *previous* build. Check `.next/BUILD_ID` mtime against the shot's mtime before
  believing a screenshot.
- `pkill -f <pattern>` matches the invoking shell's own command line. Use
  `pkill -x` or `fuser -k 3123/tcp`.
- The seeded database is named `supercruise` (`scripts/seed.mjs` `const DB`). A probe
  pointed at the wrong name renders the signed-out empty state and looks like a
  bug in the page.
- Playwright cannot reach the public internet through this environment's proxy;
  localhost is fine. Chromium is at `/opt/pw-browsers/chromium` — never run
  `playwright install`.
- **`scale()` takes a ratio.** `calc(300px / 1080)` is a *length*, which
  invalidates the whole transform silently. Card frames use a unitless
  `--card-w` and derive lengths from it.
- CSS module specificity: two single-class selectors in different modules tie,
  and bundler order decides. Use a custom property, not a second `max-width`.

---

## 8 · Deployment state

| Host | Status |
|---|---|
| `supercruise-oev7.vercel.app` | `/you`, `/wrapped`, `/profile` all **200** |
| `supercruise-production-860c.up.railway.app` | `/you` **200** |
| `supercruise-cron` (Railway) | cron service, `*/15 * * * *`, green |

**The launch gate now opens by default** (`3c88615`). It was `APP_UNLOCKED=1`-to-
open, which meant every fresh deployment shipped shut — and a shut door here is
not an error page but a silent 307 back to the marketing site. Vercel sat like
that for days. Now `APP_LOCKED=1` shuts it and nothing is needed to open it;
`APP_UNLOCKED=0` still shuts it for anything carrying the old name. Four tests in
`lib/launch.test.ts`, including the case that was broken.

CI (`.github/workflows`) runs typecheck, lint, test and build on push.

---

## 9 · Known-incomplete, inherited

**The minted share-card path still runs on the old 13-kind system** —
`lib/cards/kinds.ts`, `roster.ts`, the 13 backdrops in `public/cards`,
`components/cards/WrappedCard.tsx`, `/c/[slug]`, `/og/[slug]`, and the Pro
carousel export. The user's decision was "replace the existing system", and the
Wrapped *deck* is replaced — the share path is not.

Retiring it needs a rasteriser decision: the new cards are HTML documents and
Satori (which powers the OG images) cannot read them. Half-retiring it would
leave two card vocabularies *and* a broken share, so it was left whole and
working on purpose. This does not block the `/you` redesign — block 5 reads
`wrappedDeck`, not the old roster — but `#cards` (the minted block, currently
block 10 on `/you`) still renders `<TrophyCard>` off the old system. Decide
whether the redesign keeps that block at all; the brief's seven blocks do not
mention it.

---

## 10 · Suggested order of work

1. **Settle the hedge-fund question (§5)** — it decides what block 4 is, and it
   is the only part of the brief that cannot be built from data on hand.
2. Build the two new idioms in `components/idioms`: a donut/pie for exposure
   (`--signal` steps) and the race chart (animated, reduced-motion-safe, correct
   static state).
3. Rewrite `app/(app)/you/page.tsx` to the seven blocks, weighting 1–4.
4. Add the "Go to Wrapped" button to the top of the page.
5. Rebuild `you.module.css` on the new rhythm; keep the 1240px `--measure`.
6. Motion pass across the whole screen per §6.
7. `npm run shots`, read every dashboard shot at all three widths in both modes,
   fix, repeat.
8. Update `CLAUDE.md`'s "`/you` is the dashboard: eleven blocks…" paragraph — it
   will be wrong the moment you start.

---

## 11 · Standing constraints for whoever picks this up

- Push only to `claude/supercruise-build-instructions-b97o06`. Do **not** open a PR
  unless asked.
- Never put a model identifier in a commit message, PR body, code comment, or any
  pushed artifact.
- The OpenAI key and the MongoDB password appeared in an earlier transcript and
  **must be rotated by the user**. Never commit either.
- `/legal/privacy` is written against the code and changes in the same commit as
  anything that changes what leaves the server.
- No invented social proof, no fabricated figures, ever — on any surface.
