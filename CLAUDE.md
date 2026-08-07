# Bagcheck

Fitness tracking for your investment portfolio. Read-only, permanently: Bagcheck describes what the user did — it never places trades, never recommends one, never alerts on price.

Reference docs (read before any UI work — the design system is authoritative on anything visual):

- `docs/design-system/` — the Kylani v0.8 handoff. `README.md` is the spec; the two `.dc.html` files are the rendered reference. **This is the visual authority.**
- `docs/bagcheck-feature-architecture.md` — product layers. Its brand addendum is superseded by the design system above.
- `docs/bagcheck-build-instructions.md` — stack, project shape, milestones

## Colour

- `styles/tokens.css` is the single source of colour. A palette hex anywhere else in `app/`, `components/`, `lib/`, or `styles/` is a bug. Always `var(--*)`. (`docs/` is imported reference material and exempt.)
- Paper-and-ink, deliberately flat and matte. Canvas `--bg`, cards `--s1` white, nested panels `--sunken`, chip and track fills `--inset`.
- Light is `:root`; `html[data-mode="dark"]` is a derived ink variant the handoff does not specify — build against light.
- `--moss` (deep forest) means discipline. `--signal` (slate blue) means exposure, comparison, percentile. `--loss` marks negative P&L and nothing else — a muted terracotta, because the system adds no red. Warnings, errors, and empty states stay in ink on `--sunken`.
- **`--accent` is reserved.** It means "Bagcheck did this on its own" — the nightly score and the written daily insight. Never a hover fill, never a section heading, never decoration. `--accent` is a fill and stroke colour only; accent *text* is `--accent-deep`.
- Ink owns the primary action inside the app (`<Button>`). A moss-filled button (`<Button marketing>`) appears only on marketing surfaces, so the colour keeps its meaning in-product.
- One accent per surface — never two saturated fills competing in one view; the secondary drops to `--ink2`.
- Status is never encoded by colour alone: every state carries a word.
- Share cards and Wrapped viewers stay on the ink field in both modes, via the `--share-*` tokens.
- Tone props follow the tokens: `moss`, `signal`, `clay`, `accent`, `neutral`, `ink`. Contributor tones are persisted in Mongo, so read them through `contributorTone()` — pre-existing documents still carry the old `gold`/`violet` spellings.

## Type

- **Outfit** for display, weights 700/800: headings, score numerals, the wordmark. Always negatively tracked, and the tracking tightens with size — −.015em at 16–17px, −.02em at 18–21px, −.025em at 22–25px, −.035em at 38px+. `font-variant-numeric:tabular-nums`. Headlines capped at 9–11ch. No width axis; the negative tracking is the gesture.
- **Public Sans** for UI and body, 400/500/600: every sentence, label, button, input. Body 15px/1.7, `text-wrap:pretty`.
- **IBM Plex Mono** for machine facts only, 400/500: timestamps, counts, metadata, uppercase micro-labels at 10.5px/.09em. Never body copy, never headings.
- Mono metadata takes `--meta`, which is the contrast floor at 4.5:1 — only on white, never on `--inset`.
- Never Roboto, never Inter, and never a serif for display.

## Layout and surfaces

- 244px ink sidebar (wordmark, ledger context, labelled nav, user chip pinned at the foot — the nav list is the scrolling region). 640px reading column, 320px right rail. Below 900px: single column, bottom tab bar. The content column never stretches.
- Flex and grid with `gap` only. No margin-spaced inline siblings. Fixed-count grids use `minmax(0, 1fr)`.
- Radii: 22 hero, 20 standard, 18 nested, 16 compact, 14 rows, 11 controls, 10 buttons, 999 pills.
- Spacing: 30px content padding, 22px between major cards, 18px between cards in a row, 56px at the foot. Card padding 24–26 standard, 28–30 hero, 16–22 compact.
- 1px hairlines (`--line`; `--line-light` for row dividers inside cards).
- **Elevation is for lift only, never style**: `--lift` on every resting card, `--lift-hero` on hero panels. No glass, no blur, no backdrop-filter, no bevels, no inner shadows.
- **No decorative gradients.** Nothing in the product is iridescent or glossy.
- 44px hit targets on mobile; interactive rows ≥40px. Err toward whitespace.

## Data idioms

- One idiom per statement, each legible at 200px wide.
- Full equity curves render on Portfolio only. Never four identical sparklines.
- No decorative gradients, no emoji, no icon sets.

## Stat card grammar

- Every card reads label → number → unit → why, enforced by `<Stat>` prop order: `eyebrow → value → unit → tail`.
- The eyebrow names the metric the number measures — never an event name over a percentage.
- The tail always ships a specific comparison, never generic encouragement.

## Motion

- Global transition on buttons and inputs: `background, border-color, color, box-shadow` at .16s ease.
- Ease-out, nothing over 500ms, entrances staggered ~80ms.
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
- `lib/score` is pure functions — no I/O.
- Screens are assembled from `components/primitives`; new visual patterns start there, not inline.
