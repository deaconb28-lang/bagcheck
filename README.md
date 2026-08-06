# Bagcheck

Fitness tracking for your investment portfolio. Connect a brokerage read-only,
get a score for how you actually invest — behaviour, not returns.

Product and visual specs live in `docs/`; the working rules are in `CLAUDE.md`.

## Develop

```
npm install
npm run dev
```

Routes: `/` landing · `/scratch` primitive specimens (both modes) · `/debug`
raw M1 ledger view · `/today` `/portfolio` `/reports` `/profile` arrive with M3.

## Environment

```
cp .env.example .env.local
```

Everything degrades gracefully without env — `/debug` shows which variables are
set. Sign-in needs the three `AUTH_*` vars; brokerage connect and sync
additionally need `MONGODB_URI`, `SNAPTRADE_CLIENT_ID`, and
`SNAPTRADE_CONSUMER_KEY`.

## Milestones

M1 ledger (auth, SnapTrade, Mongo models, `/debug`) — in progress.
M2 score · M3 Today · M4 Wrapped + share cards · M5 loops · M6 Stripe ·
M7 Trader tier · M8 engine. Details in `docs/bagcheck-build-instructions.md`.
