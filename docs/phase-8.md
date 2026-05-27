# Phase 8: Protocol Gate Precision

Phase 8 improves protocol verification so live readiness is based on the real execution-critical path.

What changed:

- Every protocol check now carries `blocksLiveExecution`.
- `liveReady` now requires every blocking check to pass.
- Nonblocking warnings stay visible but do not block small buy-path preflight.
- PowerCurve docs/GitHub mismatch remains a nonblocking warning because the current buy path uses Router/Lens quote and swap preflight, not direct curve calls.
- Receipt checks now inspect both:
  - transaction `to`
  - receipt log addresses
- This covers Binance Wallet/account-router style transactions where `tx.to` is an account/aggregator contract but logs still include the 42 market/router path.

## Latest Result

Generated at `2026-05-27T04:28:25.665Z`:

- liveReady: `true`
- pass: 22
- warn: 1
- fail: 0
- blocking unresolved: 0
- nonblocking warnings: 1
- receipt checks matched 12/12 known router/controller/market paths through receipt log addresses

## Remaining Warning

`compare.docsGithub.PowerCurve` remains unresolved:

- docs legacy PowerCurve: `0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da`
- GitHub PowerCurve: `0xDC26047458FEa8Bd45164217CCb7eE90b9bE10B8`

Do not build curve-specific logic from either address until this is manually resolved. The current execution path can proceed only through Router/Lens preflight.

## Verification

Commands run:

```bash
$env:BSC_HTTP_RPC='https://bsc-dataseed.binance.org'; npm run verify:protocol
npm run verify
npm audit --audit-level=moderate
```
