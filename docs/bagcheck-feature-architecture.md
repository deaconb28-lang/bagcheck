# Canopy — feature architecture

**Fitness tracking for your investment portfolio.**

---

## The insight

Every portfolio app measures **outcomes**: returns, allocation, P&L.

Fitness trackers won by measuring **behavior**: sleep, recovery, consistency, strain.

Nobody has built that for investors — and the data already exists. Your brokerage knows your real average hold time, your win rate by hour of day, how your sizing drifts after a loss, and how much of your return came from one decision you almost reversed.

It just never shows you.

> Canopy tells you how *you* are doing as an investor, not how your portfolio did.

---

## The architecture

Five layers. Each one exists for a different job.

```
┌─────────────────────────────────────────────────┐
│  5 · BROADCAST      share cards, segments,      │  → acquisition
│                     verified records            │
├─────────────────────────────────────────────────┤
│  4 · ENGINE         correlations, tags, tilt    │  → moat
├─────────────────────────────────────────────────┤
│  3 · LOOPS          daily → weekly → quarterly  │  → retention
├─────────────────────────────────────────────────┤
│  2 · SCORE          one number, decomposed      │  → the product
├─────────────────────────────────────────────────┤
│  1 · LEDGER         read-only brokerage history │  → the foundation
└─────────────────────────────────────────────────┘
```

---

## Layer 1 · The Ledger

**Read-only brokerage connection. Every trade, every transfer, every position, all history.**

One tap via SnapTrade. Canopy can see what you did and cannot place, cancel, or modify an order.

Why it matters: this is the only layer users have to actively grant, and it's the layer that makes everything above it automatic. No manual entry. No screenshots. No CSV.

**And it arrives full.** Whoop is useless for thirty days while it learns you. We get *years* of history in ninety seconds — which means the first thing a new user sees is their own annual retrospective, before they've done anything at all.

---

## Layer 2 · The Score

**One number: Discipline. Decomposed into what moved it.**

Not a grade on returns — a measure of the part you control.

| Input | What it reads |
|---|---|
| Adherence | Did you follow your own stated rules? |
| Consistency | Sizing, cadence, hold times against your own baseline |
| Patience | Behavior during drawdowns, and how fast you sell winners |
| Exposure | Speculative weight and trade count vs. the game you said you're playing |

**The critical design choice: it's scored against *you*, not against a model investor.**

A day trader taking twelve trades a day is at baseline, not penalized. They get scored on whether they run their game consistently. A disciplined day trader should be able to score 95.

This is what makes the product work for degens and index buyers at the same time.

**Anti-gaming:** the score is built mostly from slow-moving inputs. If a user can spike it in a day, we built the wrong number — the failure mode is someone trading to raise their score.

---

## Layer 3 · The Loops

**Retention is a cadence, not a feature.**

| Rhythm | What lands | For |
|---|---|---|
| Daily, 5 sec | Pulse survey — one tap, how do you feel about the market | Everyone |
| Daily, pre-market | Your score, your events, streaks at stake | Everyone |
| Daily, post-close | Session recap: win rate, avg R, process grade | Active traders |
| Weekly | Score movement, percentile, one insight | Long-term / swing |
| Quarterly | **The earnings report** — your behavior, written up | Everyone |
| Annual | **Wrapped** | Everyone |

Each tier is a bigger moment than the last. Only the top two need to be beautiful enough to post.

**One rule that becomes the brand: we never send a price alert.** Every other app screams at volatility. We send one calm notification a day. The most valuable message we can deliver is *nothing to do today, you're on plan.*

---

## Layer 4 · The Engine

**Where the product stops being a dashboard and starts being irreplaceable.**

**Correlations.** The Whoop-journal analog — "alcohol drops your recovery 12%." Ours:

- Your average return is negative on positions opened after 2pm
- Win rate falls 20% on sessions with 6+ trades
- You sell winners three times faster than losers
- Conviction-5 positions returned 4x your conviction-2 positions

**Tags, not journaling.** Nobody fills in a blank text box. Two taps at entry: *why* (thesis / momentum / saw it online / felt cheap / revenge) and *conviction 1–5*. The brokerage supplies the what; only the user can supply the why.

**Tilt and drift.** Rapid re-entries after a loss. Sizing up after losses. Trade count triple baseline. Machine-readable, and named the day it happens — as observation, never instruction.

**Why this is the moat:** none of it works on day one. It needs months of *your* data. Value compounds with tenure, which makes leaving expensive and makes a competitor's clone useless on arrival.

---

## Layer 5 · The Broadcast

**Every feature above is private. This layer is why anyone hears about us.**

**Share cards.** Rendered server-side, every card gets a URL — pastes into X or iMessage and unfurls as artwork, click-through lands on a public page with a "get yours" button. That loop only exists because we're web-first.

**Event segments.** Strava turned stretches of road into shared, comparable units. Market events are the same primitive: everyone invested through the April drawdown gets scored on that window.

> *You ranked in the top 12% for how you handled the March selloff.*

Verifiable, like-for-like, and endlessly renewable — every notable market event auto-generates a new segment and leaderboard with zero editorial work.

**Verified records.** Finance social media is entirely unverifiable claims and everyone knows it. Read-only brokerage data makes a verified track record the most valuable social object in the category.

**Card rarity.** Some cards are common — a score, a streak. Some are scarce because the behavior behind them is scarce: sitting through a 20% drawdown, a 400-day hold, a quarter with zero panic sells. Rarity is earned by behavior, never bought, at every tier. Paid tiers unlock new *categories* of asset; only conduct unlocks the scarce ones.

---

## Why the stack holds together

| Layer | Job | What breaks without it |
|---|---|---|
| Ledger | Zero-effort data | Manual entry kills every journaling app |
| Score | A reason to open | No single number, no habit |
| Loops | Retention | Wrapped alone is one day a year |
| Engine | Defensibility | Anyone can clone a dashboard |
| Broadcast | Acquisition | Great product nobody discovers |

The mistake most competitors make is building one layer. Trade journals are Layer 1 with no score. Portfolio trackers are Layer 1 with no behavior. Wrapped clones are Layer 5 with nothing underneath.

---

## Business model

Three tiers, three different people.

| Tier | Price | Who it's for |
|---|---|---|
| **Free** | $0 | Young, social investors and traders |
| **Plus** | $9/mo | Serious traders, investors, researchers, writers, health-conscious investors, and creators on Substack |
| **Trader** | $29/mo | Active day and swing traders, and creators on X, Instagram, and TikTok |

### The shareability rule

**Sharing is never paywalled. Rarity and range are.**

A free user can post every achievement they earn, at full quality, forever — that's the funnel and we don't tax it. What paid tiers buy is *asset types that don't exist on free*: formats built for people whose reputation or research depends on them.

And rarity is **earned, not bought**. Sitting through a 20% drawdown mints a rare card whether you pay or not. Paying unlocks new categories of card; behavior unlocks the scarce ones. That distinction is what keeps the scarce cards worth posting.

### What each tier can make

| | Free | Plus | Trader |
|---|---|---|---|
| Annual Wrapped card set | ● | ● | ● |
| Score, streak, and PR cards | ● | ● | ● |
| Archetype card | ● | ● | ● |
| Rare achievement cards | ● | ● | ● |
| Report palette | assigned | choose | choose |
| Quarterly report as a carousel | — | ● | ● |
| Correlation cards | — | ● | ● |
| Segment result cards | — | ● | ● |
| Live embeddable score badge | — | ● | ● |
| Publication-grade exports | — | ● | ● |
| Daily session recap card | — | — | ● |
| Setup and tag performance cards | — | — | ● |
| Motion cards (MP4 / Reels / TikTok) | — | — | ● |
| Verified track record + public profile | — | — | ● |
| Custom handle branding | — | — | ● |

### Plus — depth, for people who write

Plus buys assets you can put in an argument.

- **Quarterly report as a carousel** — the full report exported as a multi-slide set, ready for Instagram or a Substack post
- **Correlation cards** — *conviction-5 positions returned 4x conviction-2* — these cannot exist without months of tagged data, which makes them the rarest thing on the platform and the most quoted
- **Publication-grade exports** — 4x PNG, transparent background, light and dark variants, so a card can sit inside a newsletter without looking pasted
- **Live score badge** — an embeddable widget for a Substack header or personal site that updates itself
- **Segment cards** — how you handled a specific market event, ranked against everyone else who lived through it

### Trader — cadence and proof, for people who post daily

Trader buys assets with a heartbeat.

- **Daily session recap card** — auto-generated at the close, postable in one tap. Active traders already screenshot their day; this replaces the screenshot with something that grades process instead of P&L
- **Setup performance cards** — *breakout setups: 61% over 88 trades* — the single most credible thing a trading creator can post
- **Motion cards** — short MP4 exports of a score reveal or an equity curve, built for Reels, TikTok, and X video, where static images underperform
- **Verified track record** — a public profile backed by read-only brokerage data. In a category built on unverifiable claims, this is the most valuable object we can mint
- **Custom handle branding** — their handle on the card instead of ours, which is the trade every creator will happily pay for

### Why creators sit in both tiers

Writers and traders need different things from the same product. A Substack writer needs **depth and embeddability** — assets that survive being read closely. An X or TikTok trader needs **cadence and proof** — something new every day, and a way to show the receipts. Plus serves the first, Trader the second.

Both are also our cheapest acquisition channel, which is the real argument for giving them the best assets: every card a creator posts is an ad that arrives with credibility attached.

### Secondary revenue

Printed year-in-review posters at Wrapped time. Brokerage referral fees, quietly, and never in a way that shapes the product.

---

## Build order

1. Ledger + Score + onboarding Wrapped + share-card rendering
2. Today screen, pulse survey, streaks, daily brief
3. Session recaps, rule engine, tilt detection → *Trader tier goes live*
4. Quarterly report + Stories viewer
5. Correlation engine → *once there's data depth to impress with*
6. Event segments and leaderboards
7. Verified records

---

## What we are not building

- **A trading app.** Read-only, permanently.
- **Advice.** Canopy describes what you did and what it cost or earned. It never recommends a trade.
- **Another price alert.** The category is loud. We are the quiet one.
- **A social feed.** Segments and cards give us social proof without moderation.

---

## Brand addendum

*Visual system only. Nothing in this section is a product requirement — it defines how the layers above are rendered.*

### Voice

Descriptive, never prescriptive. State what the user did; never suggest a trade, never imply urgency.

No exclamation marks, no coaching tone, no "you should." Numbers are always about behavior — hold time, drawdown response, conviction decay, streaks — never about beating a benchmark or anyone else.

One notification a day, and it is never a price alert.

### Color tokens, type, and surfaces

> **Superseded 2026-08-07.** The visual system is now the Kylani v0.8 design
> handoff in `docs/design-system/` — a paper-and-ink surface language with
> Outfit / Public Sans / IBM Plex Mono. Read `docs/design-system/README.md`
> and `styles/tokens.css` for the authoritative values; `CLAUDE.md` carries
> the working rules.
>
> What this section originally specified — an aubergine dark-first canvas,
> gold and violet accents, Archivo/Inter/JetBrains Mono, and a `wdth` width
> axis as the identifying gesture — no longer describes the product.
>
> **What survives from it, unchanged:** the semantic assignments. One colour
> means discipline and owns the marketing CTA (now `--moss`, a deep forest).
> One means exposure, comparison, and percentile (now `--signal`, a slate
> blue). Clay still marks negative P&L and nothing else. One accent per
> surface still holds. Share cards and Wrapped viewers still stay dark in
> both modes. Tabular figures on every changeable number, sentence-then-number
> on every readout, no serif anywhere.
>
> **What changed beyond colour and type:** the product is light-first; the
> left icon rail became a 244px ink sidebar with labelled routes; low neutral
> elevation is now allowed on cards where the old rule said no shadows at all;
> and one colour, `--accent`, is reserved for work Canopy did on its own.

### Data idiom

One idiom per statement, each legible at 200px:

- 63-segment rings for a quarter's discipline
- day-cell grids
- dot scatters where a cluster gap is the insight
- distribution curves with the user's marker on the tail
- decay lines
- contribution grids with the current cell lit

Full equity curves appear on Portfolio only. No decorative gradients, no emoji, no icon sets, no four identical sparklines.

### Stat card grammar

Every card reads **label → number → unit → why it matters**, in that order, and all cards in a set parse identically.

The eyebrow names the metric the number measures — never an event name sitting over a percentage. Ship the specific comparison in the tail line:

> *Your winners: 41 days. Your losers: 6.*

### Surfaces

16–22px radii, 1px hairline borders, 26–34px padding. A 640px reading column flanked by rails on desktop; single column with bottom tabs on mobile, breaking at 900px. Flex and grid with `gap`, never margin-spaced inline siblings. Err toward whitespace.

### Motion

Ease-out, nothing over 500ms, entrances staggered ~80ms. Count-ups run on `setInterval`, not `requestAnimationFrame`, and the real value is the default render so numbers are correct if the tween never starts. Always honor `prefers-reduced-motion`.

### Minimums

24px text floor on 1920×1080 slides. 12pt in print. 44px hit targets on mobile.

---

## The one-liner, for whoever asks

> Whoop for your portfolio. Connect a brokerage, get a score for how you actually invest, and find out in ninety seconds what your last three years say about you.
