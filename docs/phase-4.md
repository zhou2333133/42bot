# Phase 4: Execution Dry-Run Preflight

Phase 4 adds an observable execution-planning gate. It still does not sign or broadcast transactions.

What was added:

- `buildExecutionPlan` in core:
  - evaluates risk limits and kill switch
  - loads protocol verification gate
  - checks current gas price against `MAX_GAS_GWEI`
  - requests Lens quote when RPC is configured
  - checks BUSDT/outcome balances
  - builds exact BUSDT approve + router buy swap transactions
  - builds sell-path operator + router sell swap transactions for the later position module
  - can run `eth_call` and gas estimation for every required transaction
  - always returns `broadcastReady=false`
- API endpoint:
  - `GET /execution/plan?marketAddress=...&tokenId=...&amountUsdt=...&slippageBps=...`
- Dashboard section:
  - risk/readiness/quote/gas/precondition/broadcast status
  - required transaction plan
  - blocked reasons
- Config hardening:
  - `KILL_SWITCH=true` default
  - root-relative state/report paths across npm workspace processes

## Verification

Commands run:

```bash
npm run verify
npm run verify:protocol
npm audit --audit-level=moderate
```

Result:

- Typecheck passed.
- 7 test files passed.
- 18 tests passed.
- Build passed for core, API, bot, dashboard, and protocol verifier.
- Dependency audit found 0 moderate-or-higher vulnerabilities.
- Protocol verification: 22 pass, 1 warn, 0 fail, `liveReady=false`.

Manual smoke:

- API `/health` returned 200.
- API `/execution/plan` returned a blocked dry-run plan with protocol/risk/RPC reasons.
- Dashboard loaded at `http://localhost:4220`.
- Browser smoke confirmed:
  - Strategy Scores visible.
  - Observed Markets visible.
  - Execution Dry Run visible.
  - Dry-run button enabled.
  - Clicking it returned blocked status without an execution-plan error.

## Still Blocked Before Real Money

- `LIVE_TRADING=false` by default.
- `KILL_SWITCH=true` by default.
- `PRIVATE_KEY`, `WALLET_ADDRESS`, and private RPC are not configured.
- Protocol report remains `liveReady=false` because the PowerCurve docs/GitHub mismatch is unresolved.
- Signing and broadcasting are intentionally not implemented in Phase 4.
- The sell path needs real position indexing before it should be exposed as a user action.
