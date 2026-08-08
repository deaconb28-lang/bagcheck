# Bagcheck — cost and pricing model

What one month costs, what conversion rate the current pricing requires, and
what actually moves it.

**Headline: at $9/$29 with a brokerage-connected free tier, break-even is
~10% conversion. Consumer freemium converts 2–5%. The pricing and the free
tier as designed do not currently coexist.**

---

## 1. Where the money goes

| Service | Price | Verified |
|---|---|---|
| **SnapTrade** | **$1.00 / connected user / month** (daily data, no trading — what read-only Bagcheck needs). $2 with real-time + trading. Volume discounts offered. | [snaptrade.com/pricing](https://snaptrade.com/pricing) |
| **Anthropic** | Opus 5 $5/$25 per 1M; Sonnet 5 $3/$15 ($2/$10 intro to 2026-08-31); Haiku 4.5 $1/$5 | Model table, 2026-06-24 |
| **Finnhub** | Free tier is **personal, non-commercial only** — a monetized app needs Premium, $11.99–$99.99/mo | [finnhub.io/pricing](https://finnhub.io/pricing) |
| **logo.dev** | Free 500K req/mo; Startup $33.33/mo; Pro $150/mo | [logo.dev/pricing](https://www.logo.dev/pricing) |
| **MongoDB Atlas** | M10 ~$57/mo; backup and transfer billed on top | [comparedge](https://comparedge.com/tools/mongodb-atlas/pricing) |
| **Stripe** | 2.9% + $0.30 per successful card charge | Standard US |
| **OpenAI** | Wrapped backdrop, 1 image / user / **year** | Immaterial at any plausible price |
| **Vercel / Atlas at scale** | Estimated by tier | **Not verified** |

> **Compliance note, not a cost note.** Bagcheck is monetized, so the Finnhub
> free tier it currently runs on is outside its licence. That is a $100/month
> problem and a legal one, and it should be fixed before launch rather than
> after.

## 2. Variable cost per user per month

| Component | Cost | Share |
|---|---|---|
| SnapTrade connection | $1.00 | **83%** |
| Daily insight (Sonnet 5, cached prompt) | $0.19 | 15% |
| Wrapped backdrop (amortised) | $0.02 | 2% |
| **Total** | **$1.21** | |

The daily insight is not the problem. **The brokerage connection is 83% of
marginal cost, and it is charged on free users exactly as on paying ones.**

Routing the insight from Opus to Sonnet with prompt caching saves $0.22/user/
month — real money at scale ($11k/year at 50k users), but it moves break-even
by about one percentage point. It is worth doing and it is not the lever.

## 3. One month, at three scales

Insight on Sonnet 5 with the system prompt cached; 80/20 Plus/Trader mix;
net-of-Stripe ARPPU $12.32.

| Users | Variable | Fixed | **Total / month** | Break-even conversion | Payers needed |
|---:|---:|---:|---:|---:|---:|
| 1,000 | $1,207 | $210 | **$1,417** | 11.5% | 115 |
| 10,000 | $12,063 | $790 | **$12,853** | 10.4% | 1,044 |
| 50,000 | $60,315 | $1,950 | **$62,265** | 10.1% | 5,053 |

Fixed costs barely matter — they are 1.5–6% of the bill. This is a
**variable-cost business**, and it does not get cheaper per user with scale
unless the SnapTrade rate does.

For reference, if the insight stayed on Opus: $15,040/month at 10,000 users
and 12.2% break-even.

## 4. What this means at realistic conversion

At 10,000 users and **3% conversion** — a good outcome for consumer freemium:

- Revenue: 300 × $12.32 = **$3,696**
- Cost: **$12,853**
- **Loss: $9,157/month**, which is **$0.94 per free user per month**

That is the actual question in front of the business: *is a free Bagcheck user
worth $0.94 a month in acquisition value?* Given that Layer 5 — share cards —
is explicitly the acquisition engine, the answer is not automatically no. But
it has to be measured, not assumed, and it has to be bounded.

## 5. The levers, ranked by effect

| Lever | Break-even at 10k | Notes |
|---|---:|---|
| Nothing changes | 10.4% | |
| Insight → Sonnet + caching | 10.4% | Already in the table. Saves $2,200/mo at 50k. Do it anyway. |
| **Disconnect dormant users at 60 days** | **8.0%** | SnapTrade bills *connected* users. Reconnect on return. |
| **Trial-then-connect (14 days free, then pay or disconnect)** | **~5–6%** | Caps a non-converting user at ~$0.50 total, not $1/month forever. |
| **SnapTrade volume rate at $0.50** | **6.4%** | They advertise volume discounts. One conversation. |
| Raise to $12 / $39 | 7.7% | ARPPU net rises to $16.59. |
| Annual billing | ~neutral | Saves $3/yr in Stripe fees, costs $22/yr in discount. Do it for retention and cash, not margin. |
| Dormancy + volume rate + $12 entry | **~3.6%** | Three modest moves, and the model works. |

**The strongest single move is trial-then-connect**, because it preserves the
thing the whole acquisition thesis rests on — *"your first screen is your own
annual retrospective"* — while turning an unbounded per-user liability into a
one-time ~$0.50 cost. A user who connects, sees three years of their own
history, and does not convert has cost fifty cents and may still post a card.

The weakest move is removing the connection from the free tier. It fixes the
arithmetic and destroys the product: an empty dashboard waiting to learn you
is exactly what the landing page promises you will not get.

## 6. Pricing conversion rates, for reference

| Model | Typical free → paid |
|---|---|
| Consumer freemium, broad | 2–5% |
| Prosumer tool with a strong paid tier | 5–10% |
| Reverse-trial (full product, then gate) | 8–15% |
| Free trial requiring a card | 40–60% of trials |

Bagcheck's current shape is consumer freemium, so 2–5% is the honest planning
number and 10.4% is not reachable by better marketing. **Reverse-trial is the
shape that matches both the cost structure and the product's own promise** —
give the full retrospective, then gate the ongoing service.

## 7. What to do

1. **Fix the Finnhub licence.** $100/month, and it is not optional for a
   monetized app.
2. **Route the daily insight to Sonnet 5 and cache the system prompt.** Saves
   ~$2,200/month at 50k users for a few lines of code.
3. **Ask SnapTrade for volume pricing** before launch, not after. It is the
   single largest line and they publish that discounts exist.
4. **Disconnect at 60 days dormant, reconnect on return.** Straightforward,
   invisible to active users, and worth 2.4 points of break-even.
5. **Model reverse-trial against the current free tier.** Fourteen days of
   full access, then Plus or disconnect. This is a product decision, not an
   engineering one, and it is the one that decides whether the business works.
6. **Instrument share-card attribution** before deciding what a free user is
   worth. Right now that number is a belief, and the whole free-tier argument
   rests on it.

---

*Prices verified 2026-08-08. Sonnet 5 intro pricing expires 2026-08-31.
Vercel tiers and Atlas M30/M50 are estimates. Re-run `costs.mjs` against
current rates before committing to any of this.*
