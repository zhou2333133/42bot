# Phase 9: Manual Live-Buy CLI

Phase 9 adds the manual terminal entry point for the first J/U small live test.

What was added:

- Root script:
  - `npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500`
- Bot workspace script:
  - `npm --workspace @42bot/bot run live:buy -- ...`
- CLI behavior:
  - without `--execute`, it only builds a plan and writes a journal entry
  - with `--execute`, it calls the gated broadcaster
  - successful, blocked, and failed executions are all written to the journal
  - default execution waits for receipts
  - `--no-wait` submits and returns after hashes are available

## Safety Properties

The CLI reuses all existing gates:

- `LIVE_TRADING=true`
- `KILL_SWITCH=false`
- private RPC configured
- wallet configured
- private key matches wallet
- exact confirmation phrase configured
- protocol gate `liveReady=true`
- risk limits pass
- quote passes
- balance checks pass
- every required transaction passes `eth_call`
- every required transaction passes gas estimation

It is intentionally not exposed through the API or dashboard.

## Verification

Smoke command run locally without live config:

```bash
npm run live:buy -- --market 0x0000000000000000000000000000000000000002 --tokenId 1 --amountUsdt 1 --slippageBps 500
```

Expected result:

- plan built
- no transactions
- blocked by missing live config/RPC/wallet/confirmation
- blocked entry written to journal
- exit code 2
