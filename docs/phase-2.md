# Phase 2: Protocol Verification Gate

Phase 2 adds a repeatable verification gate before any live execution path can be built.

## Command

```bash
npm run verify:protocol
```

The command writes:

- Human report: `docs/protocol-verification-latest.md`
- Machine report: `data/protocol-verification-latest.json`

`data/` remains ignored because the JSON report changes on every run. The Markdown report is committed as the latest reviewed evidence.

## What It Verifies

- Official deployments page contains the expected BNB Chain addresses.
- Official GitHub `deployments/56-core.json` exists and reports `chainId=56`.
- Router, Controller V2, and Lens V2 addresses align between docs and official GitHub deployment data.
- Official source files contain required function names for:
  - `FTRouterV2.swapMarketV2`
  - `FTRouterV2.claimAllSimple`
  - `FTLensV2.simulateMint`
  - `FTLensV2.simulateRedeem`
  - `FTLensV2.snapshotMarket`
  - Controller market lifecycle functions
- Recent market activity can be discovered from official REST market-scoped activity.

## Current Gate Result

As of the committed report, live execution is **not ready**.

Blocking warnings:

- `BSC_HTTP_RPC` is not configured, so recent transaction receipt checks are skipped.
- Docs and GitHub deployment data differ for `PowerCurve`: docs list the legacy curve while GitHub deployment lists both `PowerCurveLegacy` and a newer `PowerCurve`.

## Required Before Phase 3 Live Execution

- Configure a BNB Chain HTTP RPC in `.env`.
- Rerun `npm run verify:protocol`.
- Manually inspect at least one latest market MINT transaction trace on BscScan and confirm the actual Router/market call path.
- Generate ABI from official source or BscScan verified contracts; do not handwrite ABI.
