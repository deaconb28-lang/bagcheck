# Bagcheck

Fitness tracking for your investment portfolio. Read-only, permanently: Bagcheck describes what the user did — it never places trades, never recommends one, never alerts on price.

Reference docs (read before any UI work — the design system is authoritative on anything visual):

- `docs/design-system/` — the Kylani v0.8 handoff. `README.md` is the spec; the two `.dc.html` files are the rendered reference. **This is the visual authority.**
- `docs/bagcheck-feature-architecture.md` — product layers. Its brand addendum is superseded by the design system above.
- `docs/bagcheck-build-instructions.md` — stack, project shape, milestones
- `docs/bagcheck-unit-economics.md` — what a month costs and what conversion rate the pricing needs. SnapTrade is 83% of marginal cost and is billed on free users; break-even at $9/$29 is ~10%. `docs/costs.mjs` re-runs the model.
- `docs/bagcheck-ai-architecture.md` — **authoritative on the AI boundary**: the five tiers, the decision procedure before any model call, the SnapTrade→Mongo→screen layers, the fact-pack contract, and the six touchpoints that earn a model. Read it before adding one.

## Colour

- `styles/tokens.css` is the single source of colour. A palette hex anywhere else in `app/`, `components/`, `lib/`, or `styles/` is a bug. Always `var(--*)`. (`docs/` is imported reference material and exempt.)
- Paper-and-ink, deliberately flat and matte. Canvas `--bg`, cards `--s1` white, nested panels `--sunken`, chip fills `--inset`.
- `--track` (meter grooves, empty data cells) is darker than the handoff's chip fill on purpose: at `#F3EFE9` a track is invisible against the paper canvas, which is where the marketing idioms sit.
- Both modes ship and dark is first-class, not derived. New users default to dark; the choice persists on the user document (`lib/db/prefs.ts`), never in localStorage, so it follows them across devices. The app layout sets `data-mode` before paint — a client effect shows one frame of the wrong mode on every navigation.
- `--moss` (deep forest) means discipline. `--signal` (slate blue) means exposure, comparison, percentile. `--loss` marks negative P&L and nothing else — a muted terracotta, because the system adds no red. Warnings, errors, and empty states stay in ink on `--sunken`.
- **`--accent` is reserved.** It means "Bagcheck did this on its own" — the nightly score and the written daily insight. Never a hover fill, never a section heading, never decoration. `--accent` is a fill and stroke colour only; accent *text* is `--accent-deep`.
- Ink owns the primary action inside the app (`<Button>`). A moss-filled button (`<Button marketing>`) appears only on marketing surfaces, so the colour keeps its meaning in-product.
- One accent per surface — never two saturated fills competing in one view.
- The accents never decorate. `--moss` appears only where the metric is a discipline signal: the Health score and its ring, the component meters, sessions inside your rules, the streak, positive P&L. Not on a progress meter, not on a selected chip, not on an icon tile. `--signal` appears only for exposure, comparison or percentile — if it is being reached for as "a nice highlight", that is a bug. `--loss` appears only on a negative number, literally never otherwise. Holdings weight bars are `--ink3`, because weight is neither discipline nor exposure — it is size. A mood chip's selected state is `--ink`, because a mood is not good or bad. Rarity on a trophy card is carried by the word "Scarce", not by a green label.
- Status is never encoded by colour alone: every state carries a word.
- Share cards and Wrapped viewers stay on the ink field in both modes, via the `--share-*` tokens.
- Tone props follow the tokens: `moss`, `signal`, `clay`, `accent`, `neutral`, `ink`. Contributor tones are persisted in Mongo, so read them through `contributorTone()` — pre-existing documents still carry the old `gold`/`violet` spellings.

## Type — three roles, three jobs, no fourth family

- **Playfair Display** 700/800 owns figures, hero display and card titles. Never a sentence, never a label, never under 17px. Tracked −.008 to −.022em, tightening with size — a high-contrast serif needs far less negative tracking than a grotesque, so these are not the old Outfit values scaled. `font-variant-numeric:tabular-nums`.
- **Public Sans** 400/500/600 owns anything that is a sentence, plus buttons and inputs. Never a metric label, never a timestamp. Body 15px/1.7, `text-wrap:pretty`.
- **JetBrains Mono** 400/500/600 owns labels, eyebrows, timestamps, counts and comparatives. Never body copy, never a heading. The moment a metric label renders in Public Sans the system starts to smear.
- Hierarchy comes from size contrast, not new elements. Every card is the same three moves: the number huge in the serif, the label tiny in mono, the tail a quiet Public Sans line. If a card reads flat, widen the gap between number and label — do not add a weight, a colour or an element.
- Three text colours and only three: `--ink` for figures and headlines, `--ink3` for sentences and tails, `--meta` for mono metadata. `--ink2` is retired from components.
- Mono metadata takes `--meta`. It departs from the handoff's `#857E74`, which measures 4.01:1 on white and 3.63:1 on the canvas — below AA at the sizes metadata is set in. `--meta` clears 4.5:1 on every surface Bagcheck uses.
- Never Roboto, never Inter, and never a fourth family. Variety is the thing that breaks this.

## Screen structure

- Every screen is score-first: `<ScreenHeader>` sticky at the top, then a hero number and its decomposition. Nothing above the fold is prose.
- `<ScreenHeader>` carries a conversational title over a mono line of machine facts, then the score chip, the sync pill, the tier chip and the one upgrade button. The score rides the header on every route so the number never leaves the screen.
- Seven routes: `/home`, `/dna`, `/wrapped`, `/patterns`, `/insights`, `/ledger`, `/cards`. `/today`, `/portfolio`, `/activity` and `/reports` are permanent redirects into them and stay that way — they are in every bookmark and every link minted before the rename. `/profile` is settings, reachable from the avatar, and is not a tab.
- One hero panel per screen. Row dividers inside a panel are `--line-light`, and the last row drops its border.

## Layout and surfaces

- 76px icon rail (`components/app/AppRail.tsx`), `--sunken`, sticky full height, seven 46px glyph buttons with native `title` tooltips — do not build a tooltip system. Mode toggle and avatar at the foot. Below 900px it becomes a five-tab bottom bar; Patterns and Ledger reach the phone through links on Home, because seven 48px targets across 390px is a tab bar you mis-tap.
- Content grid is a 620px-min column and a 336px rail sticky at `top:96px`, capped at 1360px. Below 900px the rail folds into the scroll in the same order.
- Flex and grid with `gap` only. No margin-spaced inline siblings. Fixed-count grids use `minmax(0, 1fr)`.
- Radii: 34 hero, 30 standard, 28 card-in-grid, 26 nested, 22 tiles, 18 rows, 14 buttons, 12 controls, 999 pills.
- Everything sits on a 4px base — 4/8/12/16/20/24/32/40/48. An off-grid value is a bug, not a taste call. Block rhythm: 46px between blocks in a column, 40px column-to-rail, 48px page padding, 32–38px panel padding, 120px at the foot.
- **No borders and no resting elevation on surfaces.** A surface is a *fill*: canvas `--bg`, panel `--s1`, inset `--sunken`, ink field `--share-bg`. Hairlines survive in exactly two places — row dividers inside a list, and the rule above a panel's footer. Semantic chip borders (`--moss-line`, `--signal-line`, `--accent-line`, `--loss-line`) survive because they carry meaning. Nothing else gets a stroke, and whitespace is what replaces them: shrink the spacing back and the layout collapses into a list.
- **A stat is not a box.** Eyebrow, number, 3px meter, tail, laid out as a plain column in a `gap` grid. Four small filled rectangles inside a big one is the tell.
- No glass, no blur as style, no backdrop-filter, no bevels, no inner shadows. `filter: blur()` appears only on a locked tile.
- The one gradient in the app is the fade over the drifting field in `app/(app)/app.module.css`, and its whole job is to push the artwork almost out of sight. Dark needs far more suppression than light — at the light opacity the same image reads as smoke behind the type.
- 44px hit targets on mobile; interactive rows ≥40px. Err toward whitespace.

## Data idioms

- One idiom per statement, each legible at 200px wide.
- Full equity curves render on `/dna` only. Never four identical sparklines.
- Screens read `lib/db/derived.ts`, they do not scan. Round trips, daily P&L, equity and hold times are materialised once per sync — four screens each rebuilding every round trip per navigation is a timeout waiting for a big enough ledger. Bump `DERIVED_VERSION` when that file changes meaning.
- A name whose FIFO-implied units disagree with the position snapshot is excluded from statistics, never silently averaged in. The position still renders; only the inference stops.
- No decorative gradients and no emoji.
- Icons are a closed vocabulary, not a set. `lib/icons/names.ts` `ICONS` is the whole list, and a new glyph means a new line in it — `/api/icon` serves names, never search terms. They label a fixed taxonomy — the ledger kinds, the three tiers, and the five situations an empty state can be in — and never decorate a heading, a button or a card.
- An empty state's icon names the *situation*, not the screen: signed out, deployment unconfigured, no brokerage, nothing synced, nothing scored yet. The same predicament looks the same on all seven screens.
- `iconsEnabled()` is a server-side read — the key is not `NEXT_PUBLIC` and must not become one. A client component asking it always gets `false`, so a screen asks once and passes the answer down (`<PricingTiers glyphs>`).
- The rail's route glyphs in `components/app/routes.tsx` are drawn inline by us and stay that way. They are chrome — they must be on the first paint of every screen and take `currentColor` so the active state is one background swap. A fetched glyph would be a downgrade and a dependency.
- An `<Icon>` is painted as a CSS mask, never an `<img>` or inline SVG: the shape comes from the API and the colour is `currentColor`, so a glyph takes the token of the row it sits in and no palette hex enters from outside `styles/tokens.css`.

## Stat card grammar

- Every card reads label → number → unit → why, enforced by `<Stat>` prop order: `eyebrow → value → unit → tail`.
- The eyebrow names the metric the number measures — never an event name over a percentage.
- The tail always ships a specific comparison, never generic encouragement.

## Motion

Motion is the one warm gesture in an instrument aesthetic. The softening happens in time rather than in ornament — do not add a decorative element to compensate.

- Global transition on buttons and inputs: `background, border-color, color, box-shadow` at .16s ease.
- **Scroll-driven reveals, not a load stagger.** Sections carry `data-reveal` and the `rise` keyframe; one rule in `globals.css` retargets them onto the scroll position where the browser supports it. Content above the fold is past its range at load, so it is simply there.
- Meters use `scaleX` at 800ms staggered 70ms; wave bars use `scaleY` staggered 8ms per bar so the chart draws left to right.
- The ring renders at the full-circle `stroke-dashoffset` and gets its real offset in an effect, so CSS transitions it. **The static state must be correct if the effect never runs** — under reduced motion the offset is set immediately.
- A mode change crossfades over .42s via `[data-surface] *`. Flipping light/dark should feel like a dimmer, not a repaint. It also means a contrast probe taken sooner than that measures mid-flight colours.
- Hover: rail items −1px, trophy cards −6px with −.7deg, heat cells scale 1.35, the mode toggle rotates 45°. Panels do **not** lift on hover — with borders gone there is nothing to lift.
- Everything honours `prefers-reduced-motion`, and JS tweens check `matchMedia` before starting.
- Marketing may use scroll-driven motion (`animation-timeline: view()` / `scroll()`), always behind `@supports` and `prefers-reduced-motion`, and always so the static state is the finished design. Never write a hover rule against a property a scroll animation also writes — `fill: both` wins and the hover silently dies.
- Ease-out, nothing over 500ms.
- Count-ups run on `setInterval`. The real value is the default render — if the tween never starts, the number on screen must still be correct.
- Everything honours `prefers-reduced-motion`.

## Copy rules, enforced in review

- Descriptive, never prescriptive. No "you should", no "consider", no urgency.
- No exclamation marks. No coaching tone. Sentence case everywhere.
- Buttons name what happens ("Recompute score", never "Submit"). Card headings say something rather than labelling.
- Empty states name the next move, never "nothing here yet".
- Banned: supercharge, unleash, 10x, revolutionize, game-changing, seamless, effortless, "AI-powered" as a headline, growth hacking, "in seconds".
- Numbers describe behaviour — never a benchmark and never another person — except in explicit percentile surfaces, which are `--signal`.
- One notification a day. Never a price alert.

## Code conventions

- Next.js App Router. Server components by default; `'use client'` only where interaction requires it.
- `lib/score`, `lib/engine` and `lib/cards` are pure functions — no I/O.
- Gating lives in `lib/tiers.ts` and nowhere else: components ask `can(user, capability)`, and no component reads `user.tier` directly. `Capability` has no member for minting, sharing or rarity, so those gates cannot be written — sharing is never paywalled, and `canMintCards()`/`canShareCards()` take no tier on purpose. Paid tiers unlock *categories and formats*. Stripe is the source of truth; `tierFromStatus()` downgrades to free unless the status is live. (`lib/billing/tiers.ts` still backs the marketing pricing table and the Stripe mirror.)
- Monetization is present, never blocking. A locked tile occupies the slot its unlocked twin would, blurred, with the tier named — never a modal wall in front of a screen the user asked for. Every lock carries **readiness computed from real sample counts** (`Ready now` / `38 tags to go`); never fake a Ready. No countdown, no discount banner, no trial nag.
- **A locked card's share button is absent, not disabled.** Never show a user an affordance that then refuses them.
- `<ShareButton>` is the one share affordance and it mints through `/api/cards/mint`: the client names a kind and never supplies contents, so a crafted request cannot mint a card claiming a number that never happened. What comes back is a 96-bit slug, which is the card's whole access model. `/card/[type]/[id]` is the typed URL and 301s to `/c/[slug]`, where the OpenGraph tags live — two dynamic names cannot share a path segment, which is why there is no `/og/[type]/[id]`.
- Share cards are public by slug: `cardBySlug` takes no userId and projects only what a card renders. The slug is 96 bits of randomness, because it is the card's entire access model.
- Two model providers, with a hard split: **Anthropic writes every sentence** in the product (the daily insight), **OpenAI only draws** — the Wrapped backdrop and the sixteen archetype avatars. No generated prose comes from OpenAI and no generated imagery comes from Anthropic.
- The sixteen archetypes in `lib/archetypes.ts` are the corners of a four-bit cube — each score component is above the fixed bar (60) or it is not — so nothing is curated to reach a round number and every profile lands in exactly one. The bar is fixed rather than relative to the reader's own mean, because an archetype goes on a share card and has to mean the same thing whoever wears it. No model is involved.
- Archetype avatars are **static files** in `public/archetypes`, generated once by `npm run avatars` and committed. `lib/avatars/manifest.ts` is generated from that directory, never hand-edited. Anything without a file renders the drawn emblem in `lib/avatars/drawn.ts`, which is a finished state and not a placeholder — it is what makes the set work on the first paint and on a deployment with no OpenAI key. The prompt never names the archetype, only its `emblem` form: a model given the word "Sentinel" draws a guard.
- **Card art is twelve fixed images, one per kind**, authored once by `npm run backdrops` and committed to `public/cards`. Nothing generates at request time and nothing is stored per card. This is the Wrapped model: a template is designed once and worn by millions, and what makes a card someone's own is composited over it in type — their figure, their sentence, their company. Minting is instant and free.
- `lib/wrapped/brief.ts` and `scenes.ts` are pure and exist to *author* those twelve, not to run per user: four measured quantities (magnitude, direction, texture, density) taken from a representative ledger shape each scene, so the picture for a kind matches what that kind is about.
- **The company is the per-person half.** A card about a position wears that instrument's mark and ticker through `<Logo>`, and the Wrapped card leads with the three names you closed the most round trips in — ranked by count, never by P&L, because ranking a retrospective by profit turns it into a leaderboard.
- The model never draws a glyph. Every figure on a card is set in type by us; a generated number is one nobody can correct, on an artefact whose whole claim is that its numbers came from a brokerage.
- The art prompt (`lib/wrapped/prompt.ts`) is pure and tested. It forbids text, numerals, logos, people and objects, and asks for a quiet centre — the card's own type is set in Outfit by us, and a model drawing a number would be both wrong and unfixable.
- Company marks come from logo.dev through `/api/logo/[symbol]`, never a direct URL: the token stays server-side and the route always answers with an image, so no component handles a broken one. Unknown tickers get a drawn monogram in the palette.
- Icons come from The Noun Project through `/api/icon/[name]`, signed with two-legged OAuth 1.0a in `lib/icons/noun.ts` (pure and tested; the secret never leaves the server). Fetched once and stored in Mongo with no TTL — an icon does not change, every call costs quota, and their terms forbid redistribution, so the route must never accept a search term. Third-party SVG is sanitized before it is stored. Icons are CC-BY: `/legal/icons` names the creators, and it reads the store rather than calling the API.
- Market data (Finnhub, `lib/market`) backchecks the brokerage and never becomes an event. A quote may only correct a mark the last sync left stale — never replace a mark from today, and never surface a move on its own. There is no price alert and no place to write one. `resolveMark` also refuses a quote that disagrees with the broker by more than half: that is a symbol resolving to a different instrument, not a correction.
- Anything a screen shows from market data says so, in mono, via `provenanceLine`. The brokerage stays the account of record: names fill a gap the broker left empty and never overwrite one it gave.
- `lib/market/marks.ts` and `holdings.ts` are pure and tested; `client.ts` owns the network. Calls go through `cached()` — a shared Mongo collection swept by a TTL index, keyed by request and not by user, because the rate limit is per key. Fan-out is bounded by `pooled()`. Every failure path returns the brokerage's own numbers rather than an error.
- `app/og/[slug]/render.tsx`, `lib/logos/fetch.ts`, `lib/email/render.ts`, `lib/wrapped/prompt.ts` and `lib/avatars/prompt.ts` are the files allowed to repeat palette hexes, and the reason is the same in all five: an image at a URL and a message in an inbox both carry no stylesheet, and a prompt describing a colour to a model cannot cite a custom property. Keep the values in step with the `--share-*` tokens, and give every multi-child element an explicit `display`.
- Engine findings are descriptive and self-silencing: below their sample floor they return `null` rather than report a coincidence, and the evidence line must never contradict the sentence it sits under.
- Screens are assembled from `components/primitives`, `components/idioms`, `components/app` and `components/cards`; new visual patterns start there, not inline.
- The tag loop (`lib/tags.ts`, `<TagPrompt>`) is the only input a brokerage cannot supply and every correlation is downstream of it, which is why it sits second on Home rather than in settings. Two taps, no text field — a free-text reason cannot be grouped, and a reason that cannot be grouped cannot become a finding. `TagDoc` persists the reason lower-cased, so go through `whyKey()`/`whyLabel()` rather than comparing strings.
- Screen derivations live in `app/(app)/derive.ts` and are pure. Nothing there invents a figure: where the ledger cannot answer, the function returns an empty result rather than a plausible one.
