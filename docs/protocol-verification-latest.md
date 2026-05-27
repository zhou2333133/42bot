# Protocol Verification Latest

Generated at: 2026-05-27T04:28:25.665Z

Live execution ready: **YES**

## Check Summary

- pass: 22
- warn: 1
- fail: 0
- blocking unresolved: 0
- nonblocking warnings: 1

## Checks

- PASS [BLOCKS-LIVE] `docs.address.0x888888886619275d33c00D3BC62DF94D700DCD42`: docs deployment contains 0x888888886619275d33c00D3BC62DF94D700DCD42 (critical execution path address)
- PASS [BLOCKS-LIVE] `docs.address.0x8Fe93361D2B8b9519C4d20d47a319288Feec9072`: docs deployment contains 0x8Fe93361D2B8b9519C4d20d47a319288Feec9072 (critical execution path address)
- PASS [BLOCKS-LIVE] `docs.address.0x4AAd5A856941FB64df10362024e3Ece24023d4d1`: docs deployment contains 0x4AAd5A856941FB64df10362024e3Ece24023d4d1 (critical execution path address)
- PASS [NONBLOCKING] `docs.address.0x88888888338e60bfB4657187169cFFa5c8640E42`: docs deployment contains 0x88888888338e60bfB4657187169cFFa5c8640E42 (noncritical reference/deprecated/curve address)
- PASS [NONBLOCKING] `docs.address.0xF21b2D4F8989b27f732e369907F25f0E8D95Fe62`: docs deployment contains 0xF21b2D4F8989b27f732e369907F25f0E8D95Fe62 (noncritical reference/deprecated/curve address)
- PASS [NONBLOCKING] `docs.address.0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da`: docs deployment contains 0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da (noncritical reference/deprecated/curve address)
- PASS [NONBLOCKING] `docs.address.0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d`: docs deployment contains 0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d (noncritical reference/deprecated/curve address)
- PASS [NONBLOCKING] `docs.address.0x495B31876c092c236d1b0Df5Cc953D45d41301F1`: docs deployment contains 0x495B31876c092c236d1b0Df5Cc953D45d41301F1 (noncritical reference/deprecated/curve address)
- PASS [BLOCKS-LIVE] `github.chain`: github deployment chainId=56
- PASS [BLOCKS-LIVE] `github.address.FTRouterProxy`: FTRouterProxy=0x888888886619275d33c00D3BC62DF94D700DCD42
- PASS [BLOCKS-LIVE] `github.address.FTControllerProxy`: FTControllerProxy=0x8Fe93361D2B8b9519C4d20d47a319288Feec9072
- PASS [BLOCKS-LIVE] `github.address.FTLensV2`: FTLensV2=0x4AAd5A856941FB64df10362024e3Ece24023d4d1
- PASS [BLOCKS-LIVE] `compare.docsGithub.FTRouterProxy`: FTRouterProxy docs/github address alignment (0x888888886619275d33c00D3BC62DF94D700DCD42)
- PASS [BLOCKS-LIVE] `compare.docsGithub.FTControllerProxy`: FTControllerProxy docs/github address alignment (0x8Fe93361D2B8b9519C4d20d47a319288Feec9072)
- PASS [BLOCKS-LIVE] `compare.docsGithub.FTLensV2`: FTLensV2 docs/github address alignment (0x4AAd5A856941FB64df10362024e3Ece24023d4d1)
- PASS [NONBLOCKING] `compare.docsGithub.PowerLDACurve`: PowerLDACurve docs/github address alignment (0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d)
- PASS [NONBLOCKING] `compare.docsGithub.ClockCurve`: ClockCurve docs/github address alignment (0x495B31876c092c236d1b0Df5Cc953D45d41301F1)
- WARN [NONBLOCKING] `compare.docsGithub.PowerCurve`: PowerCurve docs/github address alignment (github PowerCurve=0xDC26047458FEa8Bd45164217CCb7eE90b9bE10B8, github legacy=0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da. Noncritical for current Router/Lens buy preflight; keep monitoring before relying on curve-specific logic.)
- PASS [BLOCKS-LIVE] `source.router`: router source token check 3/3
- PASS [BLOCKS-LIVE] `source.lens`: lens source token check 4/4
- PASS [BLOCKS-LIVE] `source.controller`: controller source token check 4/4
- PASS [BLOCKS-LIVE] `activity.transactions`: Found 12 recent REST activity transactions with hashes
- PASS [BLOCKS-LIVE] `rpc.receipts`: Receipt checks matched 12/12 known router/controller/market paths (12/12 matched via receipt log addresses, which covers Binance Wallet/account-router style transactions.)

## Recent Transactions

- `0xab6991152c8f7f67f5489d1f63dccb4166122ca4987e3cf0138e7d2c27aa34ea` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0xe5c38d7a27cc8b345135bb56301d97cef658104fe4820aea114534003a25ebee` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0xff3975acf53f3f7160e8647e483dccff72c8285986c146e058bf0386e8d02e2a` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0xfbd87b220e7aae54b66562229e86cdb04cfa6e2051ad35994a9d2839a8e98b68` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0xea92df18bad1176cfc424a2f273c2e22a55b4fd2a89df8ccc196e7ba471e9213` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0xb300000b72deaeb607a12d5f54773d1c19c7028d` matchedKnownContract=true matchedLogAddress=true
- `0x3d33b7169d1565c94f0bc4598df8d131dc5f9a5cf07f664d39c1c2e25ff3030c` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0xe7b219a77f870493979bdcb97e806a6fd55376ba1026f206ff3bc1e385ba092f` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0x210fefb9b394ad12f41aaa3e31e3fcc71536ae8bdfa045d50f96ccca582461c2` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0xb300000b72deaeb607a12d5f54773d1c19c7028d` matchedKnownContract=true matchedLogAddress=true
- `0x83f8815787c05dc2e54a6a612f5b3034479d9001b2ecfd6edc987fb6bb252253` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0xc3cd788e6199f4ffadbffe60d30801e20bdbf4a10da0d8767979cd521495e593` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0x758d8b950cdc035a19c6c408d45ba24a792ac4b67ec5797f1c6718a34ddbcefa` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=true matchedLogAddress=true
- `0x1cfcfacb97896b93e0e8e4b6a24f87d878a0be86bf73052639a697e9d0efdc65` MINT market `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000` to `0xb300000b72deaeb607a12d5f54773d1c19c7028d` matchedKnownContract=true matchedLogAddress=true

## Next Required Actions

- Resolve PowerCurve docs/github address mismatch; treat docs table legacy curve and github PowerCurve separately.
- Generate ABI from official sources or verified BscScan source in Phase 3; do not handwrite ABI.

## Sources

- Official deployments: https://docs.42.space/for-developers/deployments.md
- Official GitHub deployment: https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/deployments/56-core.json
- Router source: https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/FTRouterV2.sol
- Lens source: https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/lens/FTLensV2.sol
- Controller source: https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/controllerv2/FTControllerV2.sol
