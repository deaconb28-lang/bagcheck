# Bagcheck — build instructions for Claude Code

Companion to `bagcheck-feature-architecture.md` (product + brand) and `bagcheck-brand-kit.html` (rendered reference).

Read this first, then the brand addendum. The brand addendum is authoritative on anything visual.

---

## 1. Stack

### What you named

| Layer | Choice | Notes |
|---|---|---|
| Building | Claude Code | — |
| AI processing | Anthropic API | Insight copy, report prose, tag summarisation. Use one provider, not both — two means two prompt formats to maintain |
| Brokerage data | SnapTrade | Read-only. The whole Ledger layer |
| Repo | GitHub | — |
| Hosting | Vercel | Next.js App Router, server components |
| Email | Resend | Daily brief, weekly recap, report-ready notices |
| Database | MongoDB Atlas | See the note below |
| Auth | Google | via Auth.js with the MongoDB adapter |
| Social | share targets | See the honest note below |

### What's missing

| Gap | Fill with | Why it's not optional |
|---|---|---|
| **Payments** | Stripe | Three tiers, and you already have the account. Stripe Checkout + customer portal + webhooks → tier field on the user |
| **Share card rendering** | `@vercel/og` (Satori) | Server-renders React to PNG. This is the entire Broadcast layer |
| **Motion cards** | Remotion | Renders React to MP4 for the Trader tier. Runs as a Vercel function or a Lambda render |
| **Asset storage** | Vercel Blob | Generated PNGs and MP4s need a home with a public URL |
| **Scheduled jobs** | Vercel Cron → Inngest later | Nightly score recompute, pre-market briefs, post-close recaps. Cron is fine to ~10k users; move to Inngest when a run exceeds the function timeout |
| **Product analytics** | PostHog | Funnels from connect → first Wrapped → share. Also gives you feature flags |
| **Error monitoring** | Sentry | — |
| **Rate limiting + cache** | Upstash Redis | Protects SnapTrade calls and AI calls, caches generated cards |
| **Corporate events** | Finnhub or Polygon | SnapTrade gives holdings and transactions, not upcoming earnings and ex-dividend dates. The Portfolio tab needs a second source |
| **Email templates** | React Email | Pairs with Resend; keeps the brief in the same component language |

### Two judgement calls

**MongoDB.** Fine for this, with one caveat: transaction ledgers and daily score history are time-series-shaped, and aggregation pipelines over them get awkward compared to SQL. If you're committed, model it as `users`, `connections`, `transactions`, `positionSnapshots`, `scores` (one doc per user per day), `tags`, `insights`, `cards` — and put compound indexes on `{userId, date}` everywhere. Don't nest transactions inside the user document; they grow unbounded.

**"Social media connections" is harder than it sounds.** Posting on a user's behalf requires per-platform API access that is expensive (X), restricted to business accounts (Instagram Graph), or effectively unavailable (TikTok for arbitrary posting). **Do not build posting integrations.** Build instead:

1. Server-rendered card at a public URL with correct OpenGraph and Twitter meta — pasting the link unfurls the artwork
2. Web Share API on mobile, which hands off to whatever the user already has installed
3. Download button plus copy-link, always

That covers ~100% of real sharing behaviour at ~2% of the effort, and it's the reason web-first is an advantage.

### Environment variables

```
ANTHROPIC_API_KEY
SNAPTRADE_CLIENT_ID
SNAPTRADE_CONSUMER_KEY
MONGODB_URI
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
BLOB_READ_WRITE_TOKEN
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
NEXT_PUBLIC_POSTHOG_KEY
SENTRY_DSN
MARKET_DATA_API_KEY
CRON_SECRET
```

---

## 2. Project shape

```
/app
  /(marketing)          landing, pricing, public card pages
  /(app)
    /today              default authenticated route
    /portfolio          holdings, P&L, events — the only place equity curves live
    /reports            quarterly, Wrapped archive, correlations
    /profile            archetype, records, public handle, settings
  /api
    /snaptrade          connect, callback, sync
    /stripe             checkout, portal, webhook
    /cron               nightly-score, morning-brief, close-recap
  /card/[type]/[id]     public share page (OG meta + rendered image)
  /og/[type]/[id]       @vercel/og image route
/components
  /primitives           Stat, Eyebrow, Card, Button, Chip, Row
  /idioms               SegmentRing, DayGrid, DotScatter, Distribution, DecayLine, ContributionGrid
  /cards                ShareCard variants (one component, tier-gated props)
/lib
  /score                pure functions — no I/O
  /insights             prompt builders + response validators
  /snaptrade
  /db
/styles/tokens.css      the only place a hex appears
```

**Rule for Claude Code: `tokens.css` is the single source of colour.** If a hex string appears anywhere else in the repo, that's a bug.

---

## 3. UI instructions

### Layout

- 640px reading column on desktop, flanked by a left icon rail (4 routes) and a right rail of secondary cards.
- Below 900px: single column, bottom tab bar, right-rail cards fold into the scroll in the same order.
- The content column never stretches. Extra width goes to rails or to nothing.
- Flex and grid with `gap` only. No margin-spaced inline siblings.
- Radii 16–22px, 1px hairline borders, 26–34px card padding, no shadows in-app.
- Err toward whitespace. Resist filling desktop space with more data.

### Today (the default route)

One vertical scroll, in this order:

1. **Eyebrow** — date, mono, 10px
2. **The sentence** — Archivo `wdth 108`, 29px, max 11ch, plain English, describing behaviour
3. **The score** — Archivo `wdth 118`, 60px, gold, with a mono sub-label reading `Discipline · +3 this week`
4. **Contributors** — four rows max, ranked by impact: name, 104px track bar, signed value. Gold for positive, violet for exposure, clay for negative
5. **Pulse survey** — one question, 2–4 tap targets at 44px minimum, disappears once answered
6. **Streaks at stake** — chips, gold
7. **Upcoming events** — mono list, three max, tap through to Portfolio

One hero number per screen. Everything else is a tap deeper.

### Stat card component

Fixed grammar, enforced by prop order: `eyebrow → value → unit → tail`.

```tsx
<Stat
  eyebrow="Average hold — winners"
  value={41}
  unit="days"
  tone="gold"
  tail="Your losers: 6. You hold what's working almost seven times longer."
/>
```

The eyebrow names the metric the number measures. Never an event name over a percentage. The tail always ships a specific comparison — never a generic encouragement.

### Data idioms

Six components, one per statement, each legible at 200px wide:

| Component | Use for |
|---|---|
| `SegmentRing` | a quarter's discipline — 63 segments, one per trading day |
| `DayGrid` | the same data on a wide surface |
| `DotScatter` | when a cluster gap is the insight (entries by hour) |
| `Distribution` | percentile — curve with the user's marker on the tail, in violet |
| `DecayLine` | conviction over time |
| `ContributionGrid` | deposits by week, current cell lit |

Full equity curves render on Portfolio only. Never four identical sparklines. No decorative gradients, no emoji, no icon sets.

### Motion

- Ease-out, nothing over 500ms, entrances staggered ~80ms.
- Count-ups on `setInterval`. **The real value is the default render** — if the tween never starts, the number on screen must still be correct.
- Everything wrapped in a `prefers-reduced-motion` check.

### Copy rules, enforced in review

- Descriptive, never prescriptive. No "you should", no "consider", no urgency.
- No exclamation marks. No coaching tone.
- Numbers describe behaviour, never a benchmark and never another person — except in explicit percentile surfaces, which are violet.
- One notification a day. Never a price alert.

Put these in `CLAUDE.md` at the repo root so every session inherits them.

---

## 4. Milestones

**M1 — Ledger.** Google auth, SnapTrade connect, transaction and position sync, MongoDB models, a raw `/debug` view of the parsed history. Nothing user-facing is pretty yet.

**M2 — Score.** Pure functions in `/lib/score`, style baselines (long-term / swing / active) chosen at onboarding, nightly cron recompute, contributors decomposition. Unit tests here matter more than anywhere else in the codebase.

**M3 — Today.** The four routes, the primitives, `tokens.css`, both modes. This is where the brand kit gets translated into components.

**M4 — Onboarding Wrapped + share cards.** Stories viewer, `@vercel/og` rendering, public card pages with OG meta, Web Share API. The acquisition loop closes here.

**M5 — Loops.** Resend brief, pulse survey, weekly recap, streaks.

**M6 — Stripe + tiers.** Checkout, portal, webhook, tier gating on card types.

**M7 — Trader tier.** Session recaps, rule engine, tilt detection, Remotion motion cards, verified profile.

**M8 — Engine.** Tagging at entry, correlation surfaces, event segments.

---

## 5. Starting prompt for Claude Code

> Read `bagcheck-feature-architecture.md` and `bagcheck-brand-kit.html`. Scaffold a Next.js App Router project on the structure in section 2 of the build instructions. Start with `styles/tokens.css` containing both modes exactly as specified in the brand addendum, then build the `/components/primitives` set — Stat, Eyebrow, Card, Button, Chip, Row — using only `var(--*)` colours. Show me the primitives rendered on a scratch page in both modes before touching any data.

Build the visual language before the data layer. Every later screen is an assembly of those primitives, and fixing the tokens once is cheaper than fixing them in forty components.
