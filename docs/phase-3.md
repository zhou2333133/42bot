# Phase 3: Quote And Transaction Builder

Phase 3 adds the non-broadcast execution foundation:

- Minimal ABI fragments transcribed from official 42 source signatures.
- Lens-based mint/redeem quote helpers using `eth_call` simulation.
- Router `swapMarketV2` calldata builders.
- Exact-amount BUSDT approve transaction builder.
- ERC6909 `setOperator` builder for future sell path.
- Execution readiness gate that blocks signing unless:
  - `LIVE_TRADING=true`
  - `BSC_HTTP_RPC` is configured
  - `WALLET_ADDRESS` is valid
  - `PRIVATE_KEY` exists in environment
  - protocol verification report is `liveReady=true`
  - risk engine allows the trade

## Verification

Commands run:

```bash
npm run verify
```

Result:

- Typecheck passed.
- 6 test files passed.
- 15 tests passed.
- Build passed for core, API, bot, dashboard, and protocol verifier.

Live read-only smoke:

- Used public BNB Chain RPC only for `eth_call`.
- Quoted a 1 USDT mint on market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2`.
- `FTLensV2.simulateMint` returned a valid quote and slippage-adjusted `minOtOut`.
- No signing, approve, or transaction broadcast was performed.

## Still Blocked Before Real Money

- ABI must be generated from official source or exported from BscScan verified contracts.
- A dedicated wallet and private RPC must be configured locally, not pasted into chat.
- BscScan/manual trace for the latest market call path should be recorded.
- Execution module still needs nonce/gas/preflight receipt handling and a manual confirmation path for the first J/U trades.
