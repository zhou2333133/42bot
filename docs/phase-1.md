# Phase 1: Read-Only Market Monitor

Phase 1 builds a safe observable baseline before any signing or live execution code exists.

## Verified Official Inputs

- Official deployments doc: `https://docs.42.space/for-developers/deployments.md`
- Official REST base: `https://rest.ft.42.space/`
- `GET /api/v1/markets` returns paginated market metadata.
- `GET /api/v1/market-data/activity` returns MINT/REDEEM/FINALISE/CLAIM activity.
- `GET /api/v1/market-data/prices` returns current outcome token prices.
- BNB Chain `chainId=56`.
- BUSDT collateral: `0x55d398326f99059ff775485246999027b3197955`.

## Implemented

- `@42bot/core`: config, official REST client, strategy scoring, risk guard primitives, JSON state store.
- `@42bot/bot`: periodic REST poller that writes `STATE_FILE`.
- `@42bot/api`: read-only health, snapshot, markets, scores, and refresh endpoints.
- `@42bot/dashboard`: local/VPS dashboard for bot health, risk limits, strategy scores, observed markets, activity, and prices.

## Explicitly Not Implemented Yet

- Wallet signing.
- ERC20 approve.
- Router swap calls.
- FTLens quote calls.
- Transaction receipt parsing.
- Pause/resume/kill-switch persistence.

These stay blocked until Phase 2 verifies current contract addresses, ABI, and latest market transaction traces.
