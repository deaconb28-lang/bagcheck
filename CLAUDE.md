# Bagcheck

Fitness tracking for your investment portfolio. Read-only, permanently: Bagcheck describes what the user did — it never places trades, never recommends one, never alerts on price.

Reference docs (read before any UI work — the brand addendum is authoritative on anything visual):

- `docs/bagcheck-feature-architecture.md` — product layers + brand addendum
- `docs/bagcheck-brand-kit.html` — rendered visual reference
- `docs/bagcheck-build-instructions.md` — stack, project shape, milestones

## Colour

- `styles/tokens.css` is the single source of colour. A palette hex anywhere else in `app/`, `components/`, `lib/`, or `styles/` is a bug. Always `var(--*)`. (`docs/` is imported reference material and exempt.)
- Token names are legacy: `--moss` is gold, `--signal` is violet. Keep the names.
- Both modes are declared on `html`: dark is `:root`, light is `html[data-mode="light"]`.
- Gold means discipline and owns every primary CTA. Violet means exposure, comparison, percentile. Clay (`--loss`) marks negative P&L and nothing else — warnings, errors, and empty states stay in ink.
- One accent per surface — never two saturated fills competing in one view; the secondary drops to `--ink2`.
- Share cards and Wrapped viewers stay aubergine-black in both modes.

## Type

- Archivo variable for display: `font-variation-settings:'wdth' 108–122`, weight 700, letter-spacing −.04 to −.05em, `font-variant-numeric:tabular-nums`. Headlines capped at 9–11ch.
- Inter for body: 15.5–22px, line-height 1.5–1.6, `text-wrap:pretty`. Secondary text at 60% ink, never below 13px.
- JetBrains Mono for eyebrows and metric labels: 9.5–11px, letter-spacing .18–.24em, uppercase.
- Never Roboto. Never Inter for display.

## Layout and surfaces

- 640px reading column on desktop, left icon rail (4 routes), right rail of secondary cards. Below 900px: single column, bottom tab bar. The content column never stretches.
- Flex and grid with `gap` only. No margin-spaced inline siblings.
- Radii 16–22px, 1px hairline borders, 26–34px card padding, no shadows in-app.
- 44px hit targets on mobile. Err toward whitespace — resist filling desktop space with more data.

## Data idioms

- One idiom per statement, each legible at 200px wide.
- Full equity curves render on Portfolio only. Never four identical sparklines.
- No decorative gradients, no emoji, no icon sets.

## Stat card grammar

- Every card reads label → number → unit → why, enforced by `<Stat>` prop order: `eyebrow → value → unit → tail`.
- The eyebrow names the metric the number measures — never an event name over a percentage.
- The tail always ships a specific comparison, never generic encouragement.

## Motion

- Ease-out, nothing over 500ms, entrances staggered ~80ms.
- Count-ups run on `setInterval`. The real value is the default render — if the tween never starts, the number on screen must still be correct.
- Everything honours `prefers-reduced-motion`.

## Copy rules, enforced in review

- Descriptive, never prescriptive. No "you should", no "consider", no urgency.
- No exclamation marks. No coaching tone.
- Numbers describe behaviour — never a benchmark and never another person — except in explicit percentile surfaces, which are violet.
- One notification a day. Never a price alert.

## Code conventions

- Next.js App Router. Server components by default; `'use client'` only where interaction requires it.
- `lib/score` is pure functions — no I/O.
- Screens are assembled from `components/primitives`; new visual patterns start there, not inline.
