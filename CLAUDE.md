# Bagcheck

Fitness tracking for your investment portfolio. Read-only, permanently: Bagcheck describes what the user did — it never places trades, never recommends one, never alerts on price.

Two faces, one product. Inside, Bagcheck is a black instrument that scores behaviour. Outside, it sells the artefact those numbers mint: the public angle is Wrapped-first — **"Turn your portfolio into a flex"** — connect a brokerage in two taps, get a year worth posting. The score is introduced on the landing as the coming-soon second act ("Whoop for your portfolio"), behind a waitlist. The brand is the lowercase wordmark **bagcheck** and the bag mark — a filled bag with an amber tick struck through it — drawn once as `BagMark` in `app/(marketing)/BagMark.tsx` and mirrored as the favicon in `app/icon.svg` and the home-screen icon in `app/apple-icon.png`. Keep the three in step; Next serves `apple-icon` as a raster only, so that one is a PNG rendered from the same geometry. The wordmark is never capitalised in UI chrome (prose may still say Bagcheck).

Reference docs (read before any UI work — the design system is authoritative on anything visual):

- `docs/design-system/` — the retired Kylani v0.8 paper-and-ink handoff, kept as history. **The visual authority is now this file's Colour/Type/Layout sections plus `styles/tokens.css`** — the dark luminous system the share cards established.
- `docs/bagcheck-feature-architecture.md` — product layers. Its brand addendum is superseded by the design system above.
- `docs/bagcheck-build-instructions.md` — stack, project shape, milestones
- `docs/bagcheck-unit-economics.md` — what a month costs and what conversion rate the pricing needs. SnapTrade is 83% of marginal cost and is billed on free users; break-even at $9/$29 is ~10%. `docs/costs.mjs` re-runs the model.
- `docs/bagcheck-ai-architecture.md` — **authoritative on the AI boundary**: the five tiers, the decision procedure before any model call, the SnapTrade→Mongo→screen layers, the fact-pack contract, and the six touchpoints that earn a model. Read it before adding one.

## Colour

- `styles/tokens.css` is the single source of colour. A palette hex anywhere else in `app/`, `components/`, `lib/`, or `styles/` is a bug. Always `var(--*)`; when a value needs alpha, `color-mix(in srgb, var(--token) N%, transparent)`. (`docs/` is imported reference material and exempt.)
- **Black and white. One pure-black field, white ink, a neutral grey ramp. There is no light mode in the app.** (The marketing field is the one light surface — its own bullet below.) The app is the instrument reduced to its readout: hierarchy is carried by lightness, weight and size, never by hue. High contrast and negative space do the work colour used to do (the ui-ux-pro-max reading: Exaggerated Minimalism on an OLED field). The `data-mode` attribute survives in the DOM but selects nothing.
- Canvas `--bg` (#000), panel `--s1`, rail `--sunken`, chip fill `--inset`, tile `--tile`. **A panel is a fill plus a 1px `--edge`** — on a black field the edge is what whitespace was on paper. Rows inside a list divide with `--line-light`; controls outline with `--line2`. Depth is edges and inversion, never shadow, never bevel.
- The families, on the black field — P&L in colour, everything else at a whisper:
  - `--moss` (#4ADE80, green) — discipline and profit. The score and its ring, sessions inside your rules, the streak count, positive P&L. Green means it went right.
  - `--loss` (#F26D6D, red) — negative P&L and literally nothing else. A clear red, never a siren; the minus sign and the word still ride along.
  - `--signal` (#A4B0BD, cooled steel) — exposure, comparison, percentile, a deliberate step down. Also the Plus tier's mark.
  - `--ember` (#E3D5C3, warmed sand) — streaks, PRs, scarcity. Lit, but never the lead.
  - `--accent` (#E2D9F5, pale violet, with the strongest `--accent-line` edge) — **reserved: Bagcheck's own voice.** The written daily insight, the nightly score arriving, Wrapped identity, Investor Age. Never a hover fill, never decoration.
- **Glow is rationed to live data.** All light is white; what varies is how much a meaning earns. `--glow-*` box-shadows and `--halo-*` washes mark a key metric that is measured and current — the score ring, the sync dot, an active streak. One halo per surface (`.hero` takes `data-halo`). Never chrome, never a heading, never a hover state.
- The brightest object in a view is the primary action: pure-white `--ink-field` fill on black — the inversion is the strongest gesture in a monochrome system, so it is spent on exactly one thing per screen.
- Status is never encoded by colour alone: every state carries a word. In monochrome this rule stops being a safeguard and becomes the system.
- Share cards keep the `--share-*` and `--card-*` families and their hue art — a card is an artefact with its own palette, and colourful cards inside a monochrome app is the editorial contrast, not a leak.
- **The marketing field is the second world, and it turns over once: a white editorial hero, then a dark field that runs unbroken from the Wrapped deck to the footer.** It is spoken entirely in `--mk-*` tokens, which live in `styles/tokens.css` and are read only by `app/(marketing)`; the app's tokens never appear on the landing and `--mk-*` never enters the app. The hero is black ink on white. Everything below it sits on `--mk-field`, white ink, with `--mk-violet-soft` for eyebrows, `--mk-green-soft` for money-up, `--mk-red-soft` for money-down and `--mk-amber` for the live and the scarce. Full-strength `--mk-green`/`--mk-red` are reserved for the outliers in a chart, so the ordinary days sit back. Violet and amber gradients belong to the artefacts — Wrapped cards, the early-access tier — never to a section's own ground. The phone mocks are `aria-hidden` illustrations of the app, built in JSX, never screenshots.
- Tone props follow the tokens: `moss`, `signal`, `ember`, `clay`, `accent`, `neutral`, `ink`. Contributor tones are persisted in Mongo, so read them through `contributorTone()` — pre-existing documents still carry the old `gold`/`violet` spellings.

## Type — one voice for the instrument, voices for the cards

- **Space Grotesk** 400–700 owns figures, headings and hero numbers (`--font-display`, the `.disp`/`.num` classes). Tracked −.014 to −.035em, tightening with size. `font-variant-numeric: tabular-nums`. Never a sentence, never a label.
- **Public Sans** 400/500/600 owns anything that is a sentence, plus buttons and inputs. Never a metric label, never a timestamp.
- **JetBrains Mono** 400/500/600 owns labels, eyebrows, timestamps, counts and comparatives. Never body copy, never a heading. The moment a metric label renders in the body face the system smears.
- **Card-only voices:** Anton (`--font-poster`) and Playfair Display (`--font-serif`) exist solely on share cards, where a template is a voice — they never appear in app chrome. Enforced by scope: the variables are only read inside `components/cards`, `app/c` and `app/og`.
- Hierarchy comes from size contrast, not new elements: the number huge in the grotesque, the label tiny in mono, the tail a quiet body line. If a card reads flat, widen the gap between number and label — do not add a weight, a colour or an element.
- Three text colours: `--ink` for figures and headlines, `--ink3` for sentences and tails, `--meta` for mono metadata (`--ink2` for mid emphasis where a row needs it).
- Never Roboto, never Inter. Font changes go through `app/layout.tsx` and nowhere else — with one scoped exception: the marketing group loads **General Sans** in `app/(marketing)/layout.tsx`, and no app surface may reference it. The landing speaks General Sans alone; the app's three faces never appear there.

## Screen structure

- Every screen is score-first: `<ScreenHeader>` sticky at the top, then a hero number and its decomposition. Nothing above the fold is prose.
- `<ScreenHeader>` carries a conversational title over a mono line of machine facts, then the score chip, the **Investor Age** chip (violet — the product's own reading; computed in `lib/score/age.ts`, deterministic, bounded 18–72, exposure deliberately absent), the sync pill, the tier chip and the one upgrade button. The score rides the header on every route so the number never leaves the screen.
- Seven routes: `/home`, `/dna`, `/wrapped`, `/patterns`, `/insights`, `/ledger`, `/cards`. `/today`, `/portfolio`, `/activity` and `/reports` are permanent redirects into them and stay that way — they are in every bookmark and every link minted before the rename. `/profile` is settings, reachable from the avatar, and is not a tab.
- One hero panel per screen. Row dividers inside a panel are `--line-light`, and the last row drops its border.

## Layout and surfaces

- 76px icon rail (`components/app/AppRail.tsx`), `--sunken`, sticky full height, seven 46px glyph buttons with native `title` tooltips — do not build a tooltip system. Avatar at the foot. Below 900px it becomes a five-tab bottom bar; Patterns and Ledger reach the phone through links on Home, because seven 48px targets across 390px is a tab bar you mis-tap.
- Content is one centred column, capped at 760px (`screen.module.css .grid`) — the app reads as an instrument you hold, not a console. What a rail used to carry folds into the tail of the flow in order. Panel lockups, stats, chips and tails are centre-aligned; data rows inside a panel stay left-aligned where a table's legibility demands it.
- Flex and grid with `gap` only. No margin-spaced inline siblings. Fixed-count grids use `minmax(0, 1fr)`.
- Radii: 34 hero, 30 standard, 28 card-in-grid, 26 nested, 22 tiles, 18 rows, 14 buttons, 12 controls, 999 pills.
- Everything sits on a 4px base — 4/8/12/16/20/24/32/40/48. An off-grid value is a bug, not a taste call. Block rhythm: 46px between blocks in a column, 40px column-to-rail, 48px page padding, 32–38px panel padding, 120px at the foot.
- **A surface is a fill plus a 1px `--edge`.** Dark fields need edge definition where paper needed none. Hairlines inside a panel stay rationed: row dividers (`--line-light`) and the rule above a footer. Semantic chip borders (`--moss-line`, `--signal-line`, `--ember-line`, `--accent-line`, `--loss-line`) carry meaning. Resting elevation is dark (`--lift`), never grey, never coloured.
- **A stat is not a box.** Eyebrow, number, 3px meter, tail, laid out as a plain column in a `gap` grid. Four small filled rectangles inside a big one is the tell.
- Blur is chrome, not style: the sticky `ScreenHeader` frosts over the canvas, and `filter: blur()` appears on a locked tile. Nowhere else. No bevels, no inner shadows, no glass panels.
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
- `iconsEnabled()` is a server-side read — the key is not `NEXT_PUBLIC` and must not become one. A client component asking it always gets `false`, so a screen asks once and passes the answer down as a prop.
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
- Ease-out, nothing over 500ms — for *arrivals*. Ambient loops (`breathe`, `floaty`, `wander`, `shimmer`) run long and slow, and are allowed in exactly two places: light behind live data (the score ring's halo) and marketing surfaces. Never on a panel, never on text a reader is parsing.
- Arrivals are staggered, not simultaneous: header pills, money rows and heat cells land oldest-first with delays under 300ms total. A grid caps its cascade so scale never slows arrival.
- Count-ups run on `setInterval`. The real value is the default render — if the tween never starts, the number on screen must still be correct.
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
- **Card art is thirteen fixed images, one per kind**, authored once by `npm run backdrops` and committed to `public/cards`. Nothing generates at request time and nothing is stored per card. This is the Wrapped model: a template is designed once and worn by millions, and what makes a card someone's own is composited over it in type — their figure, their sentence, their company. Minting is instant and free.
- `lib/wrapped/brief.ts` and `scenes.ts` are pure and exist to *author* those thirteen, not to run per user: four measured quantities (magnitude, direction, texture, density) taken from a representative ledger shape each scene, so the picture for a kind matches what that kind is about.
- **The company is the per-person half.** A card about a position wears that instrument's mark and ticker through `<Logo>`, and the Wrapped card leads with the three names you closed the most round trips in — ranked by count, never by P&L, because ranking a retrospective by profit turns it into a leaderboard.
- The model never draws a glyph. Every figure on a card is set in type by us; a generated number is one nobody can correct, on an artefact whose whole claim is that its numbers came from a brokerage.
- The art prompt (`lib/wrapped/prompt.ts`) is pure and tested. It forbids text, numerals, logos, people and objects, and asks for a quiet centre — the card's own type is set in Outfit by us, and a model drawing a number would be both wrong and unfixable.
- Company marks come from logo.dev through `/api/logo/[symbol]`, never a direct URL: the token stays server-side and the route always answers with an image, so no component handles a broken one. Unknown tickers get a drawn monogram in the palette.
- Icons come from The Noun Project through `/api/icon/[name]`, signed with two-legged OAuth 1.0a in `lib/icons/noun.ts` (pure and tested; the secret never leaves the server). Fetched once and stored in Mongo with no TTL — an icon does not change, every call costs quota, and their terms forbid redistribution, so the route must never accept a search term. Third-party SVG is sanitized before it is stored. Icons are CC-BY: `/legal/icons` names the creators, and it reads the store rather than calling the API.
- Market data (Finnhub, `lib/market`) backchecks the brokerage and never becomes an event. A quote may only correct a mark the last sync left stale — never replace a mark from today, and never surface a move on its own. There is no price alert and no place to write one. `resolveMark` also refuses a quote that disagrees with the broker by more than half: that is a symbol resolving to a different instrument, not a correction.
- Anything a screen shows from market data says so, in mono, via `provenanceLine`. The brokerage stays the account of record: names fill a gap the broker left empty and never overwrite one it gave.
- `lib/market/marks.ts` and `holdings.ts` are pure and tested; `client.ts` owns the network. Calls go through `cached()` — a shared Mongo collection swept by a TTL index, keyed by request and not by user, because the rate limit is per key. Fan-out is bounded by `pooled()`. Every failure path returns the brokerage's own numbers rather than an error.
- `app/og/[slug]/render.tsx`, `lib/logos/fetch.ts`, `lib/email/render.ts`, `lib/wrapped/prompt.ts` and `lib/avatars/prompt.ts` are the files allowed to repeat palette hexes, and the reason is the same in all five: an image at a URL and a message in an inbox both carry no stylesheet, and a prompt describing a colour to a model cannot cite a custom property. Keep the values in step with the `--share-*` tokens, and give every multi-child element an explicit `display`. Their tests (`prompt.test.ts`) necessarily repeat the values they assert. `app/api/badge/[slug]/route.ts` is in the same class — a self-contained SVG at a URL carries no stylesheet. `components/cards/StoryViewer.module.css` is the one component allowed `#000`/`#fff`: a fullscreen story player is a lightbox, and a lightbox is black with white chrome whatever the theme does. The landing is `app/(marketing)/page.tsx` + `landing.module.css` plus `BagMark`, `WrappedDeck`, `FirstWeek`, `PnlChart` and `WaitlistForm`: a white hero — two phone mocks apart, the equity line curling across the gap to the Wrapped handset, annotation bubbles on their edges — over a dark field carrying the Wrapped deck, the coming-soon score, the behaviour reads, the first week and the waitlist. Nothing there escapes the `--mk-*` tokens. Every animated piece is a client component whose **static state is the finished design**: the deck renders the full pile with card one on top, `FirstWeek` renders step one selected, and both refuse to start their timer under `prefers-reduced-motion`. Any manual move — drag, arrow, dot, step — stops the autoplay for good rather than fighting the reader for control. The waitlist posts to `/api/waitlist` (idempotent upsert by lowercased email; the client never writes anything but an email and a tier name). The social-proof figures live in the one `SOCIAL` constant at the top of `page.tsx` and are placeholders until real counts exist — change them there, nowhere else. The sample ledger behind `PnlChart` and the phone mocks is illustrative and says so in its own tail.
- Engine findings are descriptive and self-silencing: below their sample floor they return `null` rather than report a coincidence, and the evidence line must never contradict the sentence it sits under. A finding's `impact` is the realised P&L of the pattern's own bucket, summed off the round trips — never a projection, never an extrapolation; where no honest bucket exists (a ratio, a sizing multiple) it stays `null` and the screen shows no figure. Ledger-only findings are materialised in `derived.findings` per sync; tag-joined ones are computed live on Patterns because tags move without a sync.
- Screens are assembled from `components/primitives`, `components/idioms`, `components/app` and `components/cards`; new visual patterns start there, not inline.
- The tag loop (`lib/tags.ts`, `<TagPrompt>`) is the only input a brokerage cannot supply and every correlation is downstream of it, which is why it sits second on Home rather than in settings. Two taps, no text field — a free-text reason cannot be grouped, and a reason that cannot be grouped cannot become a finding. `TagDoc` persists the reason lower-cased, so go through `whyKey()`/`whyLabel()` rather than comparing strings.
- Screen derivations live in `app/(app)/derive.ts` and are pure. Nothing there invents a figure: where the ledger cannot answer, the function returns an empty result rather than a plausible one.
