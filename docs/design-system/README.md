# Handoff: Kylani v0.8 — agentic marketing app

## Overview

Kylani is an autonomous marketing product for startup founders. It finds a founder's buyers across the internet (Reddit, X, Discord, niche forums), posts as the founder, answers every reply and DM, runs outreach campaigns, and reports what converted. Positioning: "your first marketing hire."

This bundle covers the full logged-in application: an app shell plus eight screens (Home, Discover, Calendar, Inbox, Campaigns, Voice, Analytics, Settings), all driven by one running mock scenario — Maya Chen, founder of Dockside (dockside.app), a booking/CRM tool for marina and boat-service operators, running the campaign "Dockside — First 100 operators" on day 12.

Three product ideas every screen must express:

1. **Kylani is labor, not a dashboard.** The default state of every screen is "here is what Kylani did / is doing / wants to do next" — never an empty form.
2. **One funnel, everywhere.** Found → Engaged → In conversation → Converted is the Home hero, the campaign spine, the analytics frame, and the stage vocabulary on every card.
3. **Control is graduated, visible, per-campaign.** Three autonomy modes — Suggest (drafts only), Approve (nothing ships without you), Run (end to end) — and the current mode is always on screen.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, whatever is in place) using its established patterns, component library, and state conventions. If no environment exists yet, choose the most appropriate framework and implement there.

`Kylani v0.8.dc.html` is a single-file prototype. All styling is inline; there is no stylesheet to port. Read it for exact values, not for architecture — a real implementation should decompose it into components and, if the codebase has a token system, map the values below onto it rather than hard-coding hex.

## Fidelity

**High fidelity.** Colors, typography, spacing, radii, shadows, copy, and interaction states are final. Recreate pixel-accurately using the codebase's existing libraries. Every number in this document is the intended value.

---

## Design tokens

### Color — neutrals

| Token | Hex | Use |
|---|---|---|
| Paper | `#F6F3EE` | App canvas background (the area right of the sidebar) |
| Surface | `#FFFFFF` | Cards, panels, slide-overs, message bubbles from others |
| Surface sunken | `#FCFAF7` | Nested panels, thread background, list-row selected, guardrail rows, insight cards |
| Surface muted | `#F3EFE9` | Progress-bar tracks, chip backgrounds, closed-state fills |
| Control track | `#EFE9E1` | Segmented-control background |
| Ink | `#17140F` | Sidebar background, primary buttons, right-side message bubbles |
| Text primary | `#14120F` | Headings and body |
| Text secondary | `#4A453E` | Long-form paragraph copy inside cards |
| Text tertiary | `#6E6760` | Supporting sentences, list detail |
| Text muted | `#857E74` | All mono metadata, labels, captions |
| Hairline | `#EAE4DB` | Card borders, panel dividers |
| Hairline light | `#F4F0EA` | Row dividers inside cards |
| Hairline lighter | `#F2EDE6` | Chart gridlines |
| Border control | `#DED7CD` | Secondary button borders, input borders |
| Border control hover | `#CFC7BB` | Dashed borders, hover state |
| On-dark text | `#FDFCFA` | Text on ink |
| On-dark muted | `#B4ADA3` | Inactive sidebar nav labels |
| On-dark faint | `#9C948A` | Sidebar mono labels |
| On-dark body | `#E6E1DA` | Body copy inside the dark "Next 24 hours" card |

Sidebar internal fills are alpha on ink, not solid: `rgba(253,252,250,.06)` for cards, `.10` for the active nav item, `.09` for the divider, `.22` for the scrollbar thumb.

### Color — accent (Kylani's own activity)

One color is reserved exclusively for the agent: the status chip, new signals, and anything awaiting approval. It never appears as generic decoration, hover fill, or section-header color. Its meaning is precisely "Kylani did something and it may need you."

| Token | Hex | Use |
|---|---|---|
| Accent | `#0FA47A` | Status dot, active-stage border, focus ring, left edge on agent items, selected radio pip, active tab underline, inbox badge |
| Accent deep | `#0A7A59` | Accent text, link hover |
| Accent tint | `#E3F6EE` | Filled chip backgrounds, status-dot halo |
| Accent hairline | `#B7E4D2` | Borders on anything awaiting approval |
| Accent wash | `#F2FBF7` | Top stop of the gradient on "needs you" cards (`linear-gradient(180deg, #F2FBF7, #FFFFFF)`) |
| Accent highlight | `#C9EEDD` | Inline text highlight in the Voice before/after panel |

Accent glow shadows: `0 6px 20px -10px rgba(15,164,122,.34)` (selected funnel stage), `0 2px 10px -4px rgba(15,164,122,.4)` (status chip hover), `0 8px 22px -14px rgba(15,164,122,.5)` (selected autonomy card).

### Color — funnel scale

The four funnel stages have fixed colors used everywhere the funnel appears: Home stage cards and progress fills, the analytics area chart bands and legend, campaign mini-funnel bars.

| Stage | Hex |
|---|---|
| Found | `#8FA9B8` (pale slate) |
| Engaged | `#5B7C99` (slate) |
| In conversation | `#C8892F` (amber) |
| Converted | `#1E6B4A` (deep forest) |

### Color — semantic

| Meaning | Hex | Notes |
|---|---|---|
| Success / sent / posted / converted | `#1E6B4A` | Fill `#E9F2EC`, hairline `#BFD9CB`, hover `#17553B` |
| Replied / engaged | `#3E6B8A` on `#EDF3F7`, hairline `#CFDCE6` | |
| In conversation | `#8A5F1B` on `#FBF1E2`, hairline `#EEDCBF` | |
| Awaiting your approval / new signal | `#0A7A59` on `#E3F6EE`, hairline `#B7E4D2` | The accent |
| Scheduled | `#4A453E` on `#F3EFE9`, hairline `#EAE4DB` | |
| Draft by Kylani | `#857E74`, transparent fill, `1px dashed #CFC7BB` | |

Deliberately **no red anywhere.** Error states use ink text on sunken surface with an accent hairline. The palette carries one green for the agent (bright emerald) and one for the outcome (deep forest) — they are the same family at different values, so "Kylani is working" and "you got paid" read as one story without collapsing into each other.

### Color — categorical

Platform tiles (rounded squares, white glyph):

| Platform | Hex | Glyph |
|---|---|---|
| X | `#17140F` | 𝕏 |
| Reddit | `#C8892F` | r/ |
| LinkedIn | `#3E6B8A` | in |
| Discord | `#7A4E7E` | ◇ |
| Forum | `#8A6A4E` | ❝ |
| Email | `#5B7C99` | ✉ |

Person avatars are initials on a flat circle, color picked deterministically by hashing the name against `['#5B7C99','#7A4E7E','#C8892F','#3E6B8A','#1E6B4A','#8A6A4E']` — so the same person is always the same color across screens.

### No iridescence, no gloss

The surface language is deliberately flat and matte. Rules:

- **No decorative gradients.** The only gradients in the product are (a) the 180° accent wash on items awaiting approval, `#F2FBF7 → #FFFFFF`, and (b) the vertical fades inside the analytics area chart, from the band's own color at 34% opacity to 6%. Both are functional, not ornamental.
- **No glass, blur, backdrop-filter, or bevels.** No inner shadows, no borders that simulate light direction.
- **Shadows are for elevation only**, never for style, and are always dark-neutral and low: `0 1px 2px rgba(20,18,15,.03)` on every resting card; `0 18px 40px -30px rgba(20,18,15,.3)` added on the two hero panels (Home funnel, Needs-you rail) to lift them a half step; `0 6px 16px -8px rgba(20,18,15,.5)` on the active campaign step dot. Colored glows only ever come from the accent, and only on a selected or hovered agent element.
- **Overlays** behind slide-overs are `rgba(20,18,15,.32)` flat — no blur.
- The only "shine" allowed in the whole system is the accent status dot's halo: a 3px `#E3F6EE` ring via `box-shadow: 0 0 0 3px`.

### Contrast

The palette targets WCAG AA for all functional text.

| Pair | Ratio | Verdict |
|---|---|---|
| `#14120F` on `#FFFFFF` | 17.6:1 | AAA |
| `#14120F` on `#F6F3EE` | 16.0:1 | AAA |
| `#4A453E` on `#FFFFFF` | 9.7:1 | AAA |
| `#6E6760` on `#FFFFFF` | 5.9:1 | AA |
| `#857E74` on `#FFFFFF` | 4.5:1 | AA (metadata only, ≥10.5px mono) |
| `#FDFCFA` on `#17140F` | 16.9:1 | AAA |
| `#B4ADA3` on `#17140F` | 8.0:1 | AAA (inactive nav) |
| `#9C948A` on `#17140F` | 6.2:1 | AA (sidebar mono) |
| `#0A7A59` on `#E3F6EE` | 5.1:1 | AA |
| `#1E6B4A` on `#E9F2EC` | 5.4:1 | AA |
| `#FDFCFA` on `#1E6B4A` | 6.6:1 | AA |
| `#3E6B8A` on `#EDF3F7` | 5.0:1 | AA |
| `#8A5F1B` on `#FBF1E2` | 5.2:1 | AA |

`#857E74` is the floor and is used only for mono metadata. Never put it on `#F3EFE9` or lighter-than-white surfaces. The bare accent `#0FA47A` is **not** a text color — it is a fill and stroke color only; accent text is always `#0A7A59`.

Status is never encoded by color alone: every state carries a word, and most carry a shape difference too (dashed vs solid vs filled).

### Typography

Three families, loaded from Google Fonts:

- **Outfit** — display. Weights 700/800. Headings, funnel numbers, stat values, brand wordmark. Always negatively tracked: `-.015em` at 16–17px, `-.02em` at 18–21px, `-.025em` at 22–25px, `-.035em` at 38px.
- **Public Sans** — UI and body. Weights 400/500/600. All sentences, labels, buttons, inputs.
- **IBM Plex Mono** — machine facts only. Weights 400/500. Timestamps, counts, fit scores in log lines, source lines, purpose lines, activity log, axis labels, ALL-CAPS micro-labels. Never body copy, never headings.

| Role | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Screen title | Outfit | 25px | 700 | `-.025em`, truncates with ellipsis |
| Screen subtitle | Plex Mono | 11.5px | 400 | `#857E74`, truncates |
| Card heading | Outfit | 16–19px | 700 | `-.02em` |
| Funnel number | Outfit | 38px | 800 | `-.035em`, `line-height: 1` |
| Stat value | Outfit | 21–24px | 700 | |
| Signal quote (hero) | Public Sans | 18px | 400 | `line-height: 1.55`, `-.005em`, `text-wrap: pretty` |
| Body paragraph | Public Sans | 15px | 400 | `line-height: 1.7`, `text-wrap: pretty` |
| Message bubble | Public Sans | 15px | 400 | `line-height: 1.65` |
| List row primary | Public Sans | 14px | 600 | |
| List row secondary | Public Sans | 14px | 400 | `#6E6760` |
| Button | Public Sans | 13–14px | 600 | |
| Small button | Public Sans | 12–13px | 600 | |
| Status pill | Public Sans | 11.5px | 600 | |
| Micro label (caps) | Plex Mono | 10.5px | 400 | `letter-spacing: .09em`, uppercase, `#857E74` |
| Metadata | Plex Mono | 11–12px | 400 | `#857E74` |
| Nav item | Public Sans | 14px | 400 / 600 active | |

Sentence case everywhere. No exclamation marks. Kylani is "Kylani" or "it" — never "she" or "they."

### Spacing

Base rhythm of 4px; the values actually used are 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 40, 44.

| Context | Value |
|---|---|
| Sidebar width | 244px, padding `22px 14px 16px` |
| Content horizontal padding | 30px |
| Content top padding | 6px (header sits above at `22px 30px 16px`) |
| Content bottom padding | 56px |
| Gap between major cards | 22px |
| Gap between cards in a row | 18px |
| Card padding (hero) | 28–30px |
| Card padding (standard) | 24–26px |
| Card padding (compact / nested) | 16–22px |
| Slide-over padding | `26px 26px 44px` |
| Inbox column gap | 18px |
| Filter rail width | 222px |
| Home right rail | 344px (flex-basis 320px) |
| Inbox columns | 312px / flexible / 336px |

Max content widths per screen: Home 1560, Discover 1560, Calendar 1620, Inbox 1660, Campaigns 1300, Voice 1160, Analytics 1300, Settings 860.

### Radius

| Value | Use |
|---|---|
| 22px | Hero cards, major panels |
| 20px | Standard cards, signal cards, inbox panels |
| 18px | Funnel stage cards, autonomy cards, message bubbles, nested panels |
| 16px | Needs-you items, compact cards, calendar day columns |
| 14px | Calendar post cards, guardrail rows, settings rows, status banners |
| 13px | Sidebar chips, small stat tiles, fit-score badge |
| 11px | Segmented control, small buttons, inputs, activity rows |
| 9–10px | Nav items, buttons, small controls |
| 999px | Pills, chips, avatars, dots, progress bars |

Message bubbles asymmetric: 18px with the near corner at 6px (`border-bottom-right-radius: 6px` for the founder's side, `border-bottom-left-radius: 6px` for the other person's).

### Motion

- Global transition on buttons and inputs: `background, border-color, color, box-shadow, transform` at `.16s ease`.
- **One orchestrated moment in the whole app:** the Home funnel connector, `scaleX(0 → 1)` from `transform-origin: left` over `1s cubic-bezier(.22,.61,.36,1)`, once on mount. Nothing else in the product animates on load.
- Slide-overs: `translateX(28px) + opacity 0 → 0` over `.24s cubic-bezier(.22,.61,.36,1)`.
- `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`.

### Focus and hit targets

`button:focus-visible, input:focus-visible { outline: 2px solid #0FA47A; outline-offset: 2px; }`. Inputs also take `border-color: #0FA47A` on focus. Interactive rows are ≥40px tall; buttons ≥34px.

---

## Status vocabulary

These six words are the only status words in the product, and they appear identically on every surface:

**Draft by Kylani → Awaiting your approval → Scheduled → Sent / Posted → Replied → Converted**

Additional stage tags reuse the same pill component: New signal, Engaged, In conversation, Member, Suggested, Connected.

The Calendar week board is the only place that shortens them, because the columns are ~138px: Posted, Needs you, Draft, Scheduled. Everywhere else the full phrase is used.

Every Kylani-made item can reveal one plain sentence of *why*: the fit score on a signal card is a button that expands the reason; every activity-log line expands; every calendar post's side panel has a "Why this post exists" block; every "Needs you" item shows its reason inline.

---

## App shell

**Left sidebar** — 244px, ink `#17140F`, full height, does not scroll as a whole.

- Wordmark: 28px accent rounded square (9px radius) with white "K" in Outfit 800/16, then "Kylani" in Outfit 700/19.
- Campaign switcher: full-width button on `rgba(253,252,250,.06)`, 12px radius, mono caps label "CAMPAIGN" over the campaign name in 13.5px/600 white with a `▾`.
- Nav: Home, Discover, Calendar, Inbox (accent badge "2"), Campaigns, Analytics. Icon glyph in a 15px column, then label. Active: white text, 600 weight, `rgba(253,252,250,.10)` fill, 10px radius. Inactive `#B4ADA3`/400. **This list is the flex-growing, scrolling region** (`flex: 1 1 auto; min-height: 0; overflow-y: auto`) with its own thin dark scrollbar — so the user chip stays pinned even at short viewport heights.
- Divider `rgba(253,252,250,.09)`, then Voice and Settings.
- Bottom: user chip — 32px avatar (`#5B7C99`, "MC"), name, and current mode in mono.

**Top area** — not a bar; it floats on the canvas, `22px 30px 16px`, wraps at narrow widths.

- Left: screen title (Outfit 700/25) + mono subtitle. Both truncate. Titles are conversational, not labels: Home is "Good morning, Maya" with "Dockside — First 100 operators · day 12 of the campaign".
- Right: **status chip** — white pill, 999px, accent dot with a `#E3F6EE` halo, mono 12px sentence in present tense ("Kylani is reading 14 new threads in r/boating"). Hovering turns the border accent and adds the accent glow. Clicking opens the activity slide-over.
- **Autonomy control** — segmented Suggest / Approve / Run on `#EFE9E1`, selected segment white with hairline border and a 1px shadow.

**Activity slide-over** — 440px, white, right-anchored over a `rgba(20,18,15,.32)` scrim. Title "What Kylani did", mono subtitle "today · 34 actions · tap a line for the why". Rows are mono `HH:MM` + action; tapping expands one plain sentence in 13.5px Public Sans, indented 58px, and tints the row `#FCFAF7`.

---

## Screens

### 1. Home

Two columns that wrap: main `flex: 3 1 560px`, rail `flex: 1 1 320px` (sticky).

**Funnel hero.** Heading "One funnel, from stranger to customer", mono "day 12 · dockside.app". Four stage cards over a 2px connector that spans 10%→90% and draws once on load; the connector is a left-to-right gradient through the four stage colors. Each card: stage dot in its stage color, mono uppercase label, Outfit 800/38 count with a mono `+n` delta in success green beside it, a 6px progress track filled to the stage's share (100 / 42 / 15 / 5%), and two mono preview chips. Selected card takes an accent border and the accent glow. Counts: Found 128 (+12), Engaged 54 (+8), In conversation 19 (+3), Converted 6 (+2) — Converted's number is forest green.

**Stage preview list.** Heading changes with the selected stage ("Newest of 128 found", "54 engaged — they replied, quoted or followed", …). Rows: 32px initials avatar, name (168px fixed), the person's line (ellipsis), mono meta right-aligned.

**While you were building.** Two plain-sentence paragraphs at 15px/1.7 plus an "Open Inbox" button. Copy is fixed and specific — see the file.

**Which buyer theory is winning.** Three hypotheses, each: title + share percentage in Outfit, a 7px progress bar in the hypothesis color, a 72×26 sparkline, and a mono note. Third one reads "no conversions in 9 days · Kylani suggests retiring it."

**Going out today.** Three cards, auto-fit at 210px min: 34px platform tile, mono time and platform, title, mono purpose line, status pill. The one awaiting approval takes the accent hairline.

**Needs you rail.** Max three items, accent-hairline cards on the accent wash gradient: accent dot + mono caps kind, the ask in 14px, a mono why line, then Approve / Edit / Skip. Approve and Skip both remove the item; Edit routes to the relevant screen. When empty: "Nothing waiting on you." over "Kylani is drafting tomorrow's post and will bring it here for approval by 6pm." in a dashed card.

**Next 24 hours.** Ink card, mono caps label, four rows of accent-colored time + light body text. This is the handoff-transparency block — what happens without the founder present.

No vanity metrics on this screen. Followers and impressions never appear here.

### 2. Discover

Tabs "Signals" / "Communities" as Outfit 700/17 with a 2px accent underline on the active one. Right: List / Map segmented control.

**Filter rail** (222px, sticky): four groups — Source, Hypothesis, Fit, Stage — each option a row with a colored dot, label, and mono count. Active row gets `#F3EFE9`. Filters are real and narrow the feed.

**Signals feed.** Cards at 20px radius, 22×24px padding. Header row: 36px platform tile, community name (13.5/600) over mono author · age; right side, stage pill and a 42×42 fit-score badge (Outfit 700/15, accent-tinted when ≥85). **The quote is the hero** — 18px/1.55, the person's own words in curly quotes. Tapping the score expands "why this scored 92 — describes the exact problem, owns a 40-slip marina, posts weekly" in a sunken mono block. Footer: Draft outreach (ink) / Watch (white) / Not a fit (ghost). New signals and awaiting-approval signals carry the accent hairline.

**Map view.** Schematic territory, not geography: 660×280 SVG, communities as circles with 12% color fill and a 55% stroke, radius by signal volume, the count in Outfit 700/15 at center, mono label beneath, thin `#E7E0D6` links between related sources, and an accent dot with a white ring on any node with new signals.

**Communities tab.** Cards with platform tile, name, mono membership detail, status pill, signal count in Outfit 700/22, trend in mono, a sparkline, and two top matching threads. The Hull Truth is in "Awaiting your approval" with an "Approve joining" button that flips it to Member.

### 3. Calendar

Header: three count chips with colored dots (6 scheduled / 3 drafts by Kylani / 2 awaiting your approval) and a Week / Month toggle.

Board is one white card at 22px radius, `overflow-x: auto`, seven columns at `minmax(138px, 1fr)` separated by hairline left borders, `overflow-wrap: anywhere`. Today's column takes a sunken fill and its date sits in an ink chip.

**Post cards**: 22px platform tile + mono time, title at 12.5px/1.45, mono purpose line ("serves: phone-bookings hypothesis", "answers 12 signals from r/boating") — every post knows why it exists — and a short status pill. Awaiting-approval cards take the accent hairline.

**Empty slots aren't "+"**: they show Kylani's suggestion in a dashed ghost card — mono caps "Kylani suggests", the proposal, and Accept / Change.

**Post panel** (480px slide-over): mono when-line, "X post" heading, a platform-framed preview (avatar, handle, the post body at 15px/1.7 with `white-space: pre-line`), a "Why this post exists" block, then Approve & schedule / Edit / Skip.

### 4. Inbox

Three panes in a wrapping flex row: list `1 1 300px`, thread `3 1 420px`, context `1 1 320px`. Full height minus 148px.

**List.** Tabs: Needs you (2) · Kylani handling · Waiting on them · Done. Rows: 34px avatar, name + mono time, mono source, last line (ellipsis), stage pill. Rows awaiting approval carry a 3px accent left edge. Footer: "Approve all 2 routine drafts."

**Thread.** Header with avatar, name, mono meta, stage pill. Messages on a `#FCFAF7` field: the other person left (white, hairline), the founder right (ink, white text), both with a mono attribution line — the founder's reads "Maya, sent by Kylani". Between messages, funnel markers as green mono capsules ("moved to In conversation", "moved to Converted").

**Draft.** Above it, one mono reasoning line with an accent dot: "Suggesting a call link — they asked about pricing twice, and your rule escalates pricing to you." The draft itself sits in an accent-hairline card on the accent wash with a floating "Draft by Kylani" tag notched into the top border, then Approve & send / Edit / Write my own. After sending, it becomes a green banner "Sent as you." with an Undo. In **Run mode** it is already "Sent by Kylani — 10-minute undo window". Paused threads instead show "Kylani is waiting 2 days before following up." with "Nudge now".

**Context rail.** 46px avatar, name, role. "Where Kylani found them" — the original quoted signal with a 2px accent left rule — plus mono provenance ("The Hull Truth · found day 9 · fit 89"). Two stat tiles (Fit, Touches). Hypothesis matched. Full touch history as mono day/action pairs. "Move to Converted" in success green. *This rail is the argument for all-in-one: the conversation and the intelligence on one screen.*

### 5. Campaigns

**Index.** Cards with name, goal, mode pill, a mini funnel of four counts each with a 4px bar in its stage color, and a plain-words health line. One card is paused at 78% opacity with a dashed mode pill. A dashed "Give Kylani a job" card sits alongside: "A URL, a goal, and who you think buys. Kylani proposes the rest for your approval."

**Detail spine.** Five numbered step dots on a 2px connector — Goal, Audience, Content, Conversations, Results — the active one ink-filled with a drop shadow. Below, a sunken panel with label/value rows (136px mono caps label column) and a closing sentence. The panels are written so a founder reading top to bottom can explain out loud how Kylani turns a stranger in r/boating into a customer. Step 4's Autonomy row reflects the live mode.

### 6. Voice

**Before/after is the hero.** Two panels side by side: left "Generic AI reply" in muted text on a sunken card; right "The same reply, in your voice" in an accent-hairline card on the accent wash, with one phrase highlighted in `#C9EEDD` and a mono line naming what was matched ("short sentences, 'yeah', offers a look instead of a demo").

**Test the voice.** Input + "Draft it in my voice" produces a draft card in the same accent treatment.

**Guardrails.** Editable rules as rows with a slate dot and a Remove action, plus a natural-language add field. Defaults: never discuss competitors by name; always include the booking link in DMs; no emojis; pricing questions escalate to me.

**How much rope Kylani gets.** Three autonomy cards with a radio pip; the selected one takes the accent wash, accent hairline, and accent glow. Honest one-liners:
- Suggest — "Kylani drafts and shows you everything. Nothing is scheduled or sent."
- Approve — "Kylani drafts, schedules and queues. Nothing goes out until you say so."
- Run — "Kylani sends without asking. You get a daily digest and a 10-minute undo window."

Then per-surface overrides (Posts / Replies / DMs) as small segmented controls. **No tone sliders, no persona dropdowns** — the voice comes from real writing, and the UI says so.

### 7. Analytics

Frame is revenue, not reach.

**Funnel over time.** Four stage totals in Outfit 800/38 with dots and deltas, a period selector, then a stacked smooth-curve area chart — 1180×230 viewBox with `preserveAspectRatio: none` and a fixed 230px height, each band filled with a vertical gradient of its own color (34% → 6%) and stroked with `vector-effect: non-scaling-stroke`. **Axis labels and legend are HTML below the chart, not SVG text** — SVG text would scale down with the viewBox and become unreadable.

**What's working.** Three insight cards, each with a mono category tag (Cadence / Access / Speed), a plain-sentence finding, mono evidence, and a one-click action.

**Where they came from.** Horizontal bars per source: slate at 40% for conversations, forest green overlaid for conversions, with a colored source dot and mono counts.

**Six paying operators, and where each came from.** The receipts table: avatar + customer, source, first signal, days to convert, hypothesis matched.

**Reach** is collapsed at the bottom behind "followers and impressions — show". Followers 1,284 · Impressions 96.2k · Best post 31 replies.

### 8. Settings

Connected accounts as rows: platform tile, name, mono handle, status pill. LinkedIn sits in "Awaiting your approval".

---

## Interactions and behavior

| Trigger | Result |
|---|---|
| Sidebar nav | Switch screen, close any open slide-over |
| Status chip | Toggle the activity slide-over |
| Activity row | Expand/collapse its "why" (one at a time) |
| Autonomy segment (top bar or Voice card) | Sets global mode; Inbox drafts become auto-sent with an undo window in Run |
| Funnel stage card | Filters the preview list below |
| Needs-you Approve / Skip | Removes the item; Edit routes to Inbox / Calendar / Discover |
| Fit score badge | Toggles the scoring reason |
| Not a fit | Removes the signal from the feed |
| Filter rail option | Filters signals by source, hypothesis, fit ≥85, or stage |
| Approve joining | Hull Truth flips from Awaiting your approval to Member |
| Calendar post card | Opens the post slide-over |
| Inbox tab / row | Switches the filtered list / the open thread |
| Approve & send | Draft becomes "Sent as you." with Undo |
| Approve all | Sends both routine drafts |
| Move to Converted | Thread stage becomes Converted; the Home Converted count increments |
| Campaign step dot | Swaps the panel below |
| Test the voice | Produces a draft from the typed topic |
| Add rule / Remove | Mutates the guardrail list |
| Reach header | Expands the collapsed vanity metrics |

Hover: secondary buttons fill `#F6F3EE`; ink buttons go to `#000`; ghost buttons darken text to `#14120F`; the status chip gains an accent border and glow; the "Give Kylani a job" card gains an accent dashed border.

**Responsive.** Desktop-first. The header, Home columns, and Inbox panes are wrapping flex rows with flex-basis minimums, so they reflow rather than overflow. All fixed-count grids use `minmax(0, 1fr)` to defeat the min-content floor. The calendar board scrolls horizontally below ~1000px rather than crushing its columns.

**Loading / empty / error.** Empty states name what Kylani will do next, never "nothing here yet" — e.g. a new campaign's Discover shows "Kylani's first sweep is running" with sources checking off. Errors are a plain explanation plus the fix, ink on sunken surface with an accent hairline, no apology and no red.

---

## State

Single component state in the prototype; split per route in a real app.

| Key | Type | Purpose |
|---|---|---|
| `screen` | enum | Active route |
| `mode` | `Suggest\|Approve\|Run` | Global autonomy; drives Inbox draft behavior and the Campaigns Conversations panel |
| `logOpen`, `logOpenIdx` | bool, int | Activity slide-over and expanded row |
| `stage` | enum | Selected funnel stage on Home |
| `needsSkipped` | string[] | Dismissed Needs-you items |
| `dTab`, `dView`, `filter`, `whyIdx`, `dismissed` | — | Discover tab, list/map, active filter, expanded reason, removed signals |
| `calSel` | object\|null | Open calendar post |
| `joined` | bool | Hull Truth membership |
| `inboxTab`, `convo`, `sentIds`, `converted` | — | Inbox filter, open thread, sent drafts, converted threads |
| `step` | int | Campaign spine step |
| `period`, `reachOpen` | — | Analytics controls |
| `testTopic`, `testOut`, `ruleDraft`, `rules`, `overrides` | — | Voice screen |

Data fetching a real implementation needs: campaigns, funnel counts + deltas by stage, signals (source, author, quote, fit, reason, stage, hypothesis), communities with volume series, scheduled posts with purpose and why, conversations with messages + drafts + reasoning, lead context with touch history, hypothesis performance, source attribution, converted cohort, and the agent activity log.

---

## Assets

No images or icon library. Platform and nav marks are Unicode glyphs (`𝕏 r/ in ◇ ❝ ✉ ◈ ◎ ▦ ⬢ ◧ ❞ ⚙`) set in Outfit inside colored tiles. Replace with the codebase's real icon set on implementation — keep the tile shape, size, and color mapping. Sparklines, the territory map, and the area chart are hand-drawn SVG; port them to whatever chart primitive the codebase uses, preserving the stage color scale and the HTML-not-SVG rule for labels.

Fonts: Outfit, Public Sans, IBM Plex Mono — all Google Fonts, weights 400/500/600/700/800.

## Copy rules

Plain names in navigation (Calendar, Inbox, Campaigns — no invented brand words). Buttons say exactly what happens ("Approve & send", never "Submit"). Sentence case. No exclamation marks. Card headings say something rather than labeling ("Which buyer theory is winning", not "Hypotheses"). Never scold or diagnose the reader. Quoted buyer signals are sacred — reproduce them verbatim, including their lowercase and typos.

Banned in all product and marketing copy: supercharge, unleash, 10x, revolutionize, game-changing, seamless, effortless, "AI-powered" as a headline, growth hacking, "in seconds."

## Files

- `Kylani v0.8.dc.html` — the full application prototype, all eight screens. Single file, inline styles, no build step; open directly in a browser.
- `Kylani v0.8 Foundation.dc.html` — the conventions sheet: accent rule, status badge set, sample card, button set, funnel treatment. Useful as a quick visual index of the primitives.

Both are in this folder.
