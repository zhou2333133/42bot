# Protocol Verification Latest

Generated at: 2026-05-27T02:45:50.979Z

Live execution ready: **NO**

## Check Summary

- pass: 22
- warn: 1
- fail: 0

## Checks

- PASS `docs.address.0x888888886619275d33c00D3BC62DF94D700DCD42`: docs deployment contains 0x888888886619275d33c00D3BC62DF94D700DCD42
- PASS `docs.address.0x8Fe93361D2B8b9519C4d20d47a319288Feec9072`: docs deployment contains 0x8Fe93361D2B8b9519C4d20d47a319288Feec9072
- PASS `docs.address.0x4AAd5A856941FB64df10362024e3Ece24023d4d1`: docs deployment contains 0x4AAd5A856941FB64df10362024e3Ece24023d4d1
- PASS `docs.address.0x88888888338e60bfB4657187169cFFa5c8640E42`: docs deployment contains 0x88888888338e60bfB4657187169cFFa5c8640E42
- PASS `docs.address.0xF21b2D4F8989b27f732e369907F25f0E8D95Fe62`: docs deployment contains 0xF21b2D4F8989b27f732e369907F25f0E8D95Fe62
- PASS `docs.address.0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da`: docs deployment contains 0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da
- PASS `docs.address.0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d`: docs deployment contains 0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d
- PASS `docs.address.0x495B31876c092c236d1b0Df5Cc953D45d41301F1`: docs deployment contains 0x495B31876c092c236d1b0Df5Cc953D45d41301F1
- PASS `github.chain`: github deployment chainId=56
- PASS `github.address.FTRouterProxy`: FTRouterProxy=0x888888886619275d33c00D3BC62DF94D700DCD42
- PASS `github.address.FTControllerProxy`: FTControllerProxy=0x8Fe93361D2B8b9519C4d20d47a319288Feec9072
- PASS `github.address.FTLensV2`: FTLensV2=0x4AAd5A856941FB64df10362024e3Ece24023d4d1
- PASS `compare.docsGithub.FTRouterProxy`: FTRouterProxy docs/github address alignment (0x888888886619275d33c00D3BC62DF94D700DCD42)
- PASS `compare.docsGithub.FTControllerProxy`: FTControllerProxy docs/github address alignment (0x8Fe93361D2B8b9519C4d20d47a319288Feec9072)
- PASS `compare.docsGithub.FTLensV2`: FTLensV2 docs/github address alignment (0x4AAd5A856941FB64df10362024e3Ece24023d4d1)
- PASS `compare.docsGithub.PowerLDACurve`: PowerLDACurve docs/github address alignment (0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d)
- PASS `compare.docsGithub.ClockCurve`: ClockCurve docs/github address alignment (0x495B31876c092c236d1b0Df5Cc953D45d41301F1)
- WARN `compare.docsGithub.PowerCurve`: PowerCurve docs/github address alignment (github PowerCurve=0xDC26047458FEa8Bd45164217CCb7eE90b9bE10B8, github legacy=0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da)
- PASS `source.router`: router source token check 3/3
- PASS `source.lens`: lens source token check 4/4
- PASS `source.controller`: controller source token check 4/4
- PASS `activity.transactions`: Found 12 recent REST activity transactions with hashes
- PASS `rpc.receipts`: Receipt checks matched 10/12 known router/controller destinations

## Recent Transactions

- `0x7945827b522d3020f1e7b05000375026cf69459fd2eda0f749bf2f01022cd525` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=false
- `0x0178b8737db76bfe0b98a4b494350c8623def6597d0366bcddcc3a7387013bb6` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0x29de9ed16de781f7ab4c30e5a35e72cbdeb689a8a8010945de0962c7614376b3` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0x2a289f7edbc26d2b7555751d082eedfeb3a652c610bde451a019a9d015ad6ad2` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0x6f6edf7aa5c9bee3edd8493acc49211ee3ff22bc166e669b711dd1092ad1cc43` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0x36db86af062ecc68814c0a790b315a2be9f9305ea472e1d8c7aa9c030e2918a4` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0xf885c2f1a6311c1cde13c0090e23df27ad2ff675a7e798cb7532138a9ff6d422` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0x1fe136471059f00cead11fc1249db452bdaf2ad010dad4a65f3e9414eaca9656` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0xd22e15761c0807e395aa9dc899ee07ec4efbecbcc6fff540aec51c3c3360b905` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0xcf933a1a147a3f668bfe0535a3921500fd96d166a58c9d253ec9c4546b927231` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x0000000071727de22e5e9d8baf0edac6f37da032` matchedKnownContract=false
- `0xc1975348c6ba8c01abb52f0ca7c1fd144315880f8f0ec3cec85dda000861c9b3` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true
- `0x696cf88d92b7b9e30a397a5ad541853fa633e2fdb4bd52b02c91b1246426a508` MINT market `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` to `0x888888886619275d33c00d3bc62df94d700dcd42` matchedKnownContract=true

## Next Required Actions

- Resolve PowerCurve docs/github address mismatch; treat docs table legacy curve and github PowerCurve separately.
- Generate ABI from official sources or verified BscScan source in Phase 3; do not handwrite ABI.

## Sources

- Official deployments: https://docs.42.space/for-developers/deployments.md
- Official GitHub deployment: https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/deployments/56-core.json
- Router source: https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/FTRouterV2.sol
- Lens source: https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/lens/FTLensV2.sol
- Controller source: https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/controllerv2/FTControllerV2.sol
