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

No domain yet? Two options:

- Register the Google OAuth client against `http://localhost:3000` and your
  `*.vercel.app` URL (redirect URI `<origin>/api/auth/callback/google`) and
  add the real domain to the same client later — no code change.
- Or skip auth entirely for now: set `DEV_USER_ID=<anything>` and `/debug`
  plus the SnapTrade connect/sync flow run under that stand-in identity.
  The bypass only works while the `AUTH_*` vars are absent and should not
  be left set on a public deployment.

## Milestones

M1 ledger (auth, SnapTrade, Mongo models, `/debug`) — in progress.
M2 score · M3 Today · M4 Wrapped + share cards · M5 loops · M6 Stripe ·
M7 Trader tier · M8 engine. Details in `docs/bagcheck-build-instructions.md`.
