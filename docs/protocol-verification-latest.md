# 最新协议核验报告

生成时间：2026-05-27T04:46:26.319Z

实盘执行就绪：**是**

## 检查摘要

- 通过：22
- 警告：1
- 失败：0
- 实盘阻断未解决项：0
- 非阻断警告：1

## 检查项

- 通过 [阻断实盘] `docs.address.0x888888886619275d33c00D3BC62DF94D700DCD42`: 官方文档包含部署地址 0x888888886619275d33c00D3BC62DF94D700DCD42 (实盘执行关键路径地址)
- 通过 [阻断实盘] `docs.address.0x8Fe93361D2B8b9519C4d20d47a319288Feec9072`: 官方文档包含部署地址 0x8Fe93361D2B8b9519C4d20d47a319288Feec9072 (实盘执行关键路径地址)
- 通过 [阻断实盘] `docs.address.0x4AAd5A856941FB64df10362024e3Ece24023d4d1`: 官方文档包含部署地址 0x4AAd5A856941FB64df10362024e3Ece24023d4d1 (实盘执行关键路径地址)
- 通过 [非阻断] `docs.address.0x88888888338e60bfB4657187169cFFa5c8640E42`: 官方文档包含部署地址 0x88888888338e60bfB4657187169cFFa5c8640E42 (非关键引用/废弃/曲线地址)
- 通过 [非阻断] `docs.address.0xF21b2D4F8989b27f732e369907F25f0E8D95Fe62`: 官方文档包含部署地址 0xF21b2D4F8989b27f732e369907F25f0E8D95Fe62 (非关键引用/废弃/曲线地址)
- 通过 [非阻断] `docs.address.0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da`: 官方文档包含部署地址 0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da (非关键引用/废弃/曲线地址)
- 通过 [非阻断] `docs.address.0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d`: 官方文档包含部署地址 0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d (非关键引用/废弃/曲线地址)
- 通过 [非阻断] `docs.address.0x495B31876c092c236d1b0Df5Cc953D45d41301F1`: 官方文档包含部署地址 0x495B31876c092c236d1b0Df5Cc953D45d41301F1 (非关键引用/废弃/曲线地址)
- 通过 [阻断实盘] `github.chain`: GitHub 部署文件 chainId=56
- 通过 [阻断实盘] `github.address.FTRouterProxy`: FTRouterProxy=0x888888886619275d33c00D3BC62DF94D700DCD42
- 通过 [阻断实盘] `github.address.FTControllerProxy`: FTControllerProxy=0x8Fe93361D2B8b9519C4d20d47a319288Feec9072
- 通过 [阻断实盘] `github.address.FTLensV2`: FTLensV2=0x4AAd5A856941FB64df10362024e3Ece24023d4d1
- 通过 [阻断实盘] `compare.docsGithub.FTRouterProxy`: FTRouterProxy 官方文档/GitHub 地址一致性 (0x888888886619275d33c00D3BC62DF94D700DCD42)
- 通过 [阻断实盘] `compare.docsGithub.FTControllerProxy`: FTControllerProxy 官方文档/GitHub 地址一致性 (0x8Fe93361D2B8b9519C4d20d47a319288Feec9072)
- 通过 [阻断实盘] `compare.docsGithub.FTLensV2`: FTLensV2 官方文档/GitHub 地址一致性 (0x4AAd5A856941FB64df10362024e3Ece24023d4d1)
- 通过 [非阻断] `compare.docsGithub.PowerLDACurve`: PowerLDACurve 官方文档/GitHub 地址一致性 (0xa59096C20022a9ec5d7691E0DcDc7D46776b1b3d)
- 通过 [非阻断] `compare.docsGithub.ClockCurve`: ClockCurve 官方文档/GitHub 地址一致性 (0x495B31876c092c236d1b0Df5Cc953D45d41301F1)
- 警告 [非阻断] `compare.docsGithub.PowerCurve`: PowerCurve 官方文档/GitHub 地址一致性 (GitHub PowerCurve=0xDC26047458FEa8Bd45164217CCb7eE90b9bE10B8, GitHub 旧版=0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da。当前 Router/Lens 买入预演不直接依赖该地址，因此不是实盘关键阻断项；在构建曲线专用逻辑前必须继续跟踪。)
- 通过 [阻断实盘] `source.router`: router 源码关键标记检查 3/3
- 通过 [阻断实盘] `source.lens`: lens 源码关键标记检查 4/4
- 通过 [阻断实盘] `source.controller`: controller 源码关键标记检查 4/4
- 通过 [阻断实盘] `activity.transactions`: 找到 12 条带交易 hash 的近期 REST activity
- 通过 [阻断实盘] `rpc.receipts`: 交易回执检查命中 12/12 条已知 router/controller/market 路径 (12/12 条通过交易回执日志地址命中，可覆盖 Binance Wallet/account-router 风格交易。)

## 近期交易

- `0x4c26fbd312d5845771f3615b7d8eec162884c55b2e228ab3e272f876e95fa7a5` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x0000000071727de22e5e9d8baf0edac6f37da032`，命中已知合约=是，通过 log 地址命中=是
- `0xc8deae4542e08202ae7e9289905b50943860dd1a998a6f9461eaf7e4e6c8ed11` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x0000000071727de22e5e9d8baf0edac6f37da032`，命中已知合约=是，通过 log 地址命中=是
- `0x688039c6dd7bfdb748561965011696d36551b896633d6bffb30230844b4e5e3f` REDEEM，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x888888886619275d33c00d3bc62df94d700dcd42`，命中已知合约=是，通过 log 地址命中=是
- `0x0e649222088dcec49e64e0890a574a990b46de0088bd17ca8b9267333061f444` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x0000000071727de22e5e9d8baf0edac6f37da032`，命中已知合约=是，通过 log 地址命中=是
- `0xf990f1a8d96365b955f810a0ef474c8c9d88a952ece953b5e6107381399ba9c6` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0xb300000b72deaeb607a12d5f54773d1c19c7028d`，命中已知合约=是，通过 log 地址命中=是
- `0x4edfb5e82a56dda1bb84ca01de59181594882c110d57ca6f4c5accc5560f1a17` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x0000000071727de22e5e9d8baf0edac6f37da032`，命中已知合约=是，通过 log 地址命中=是
- `0x2787739a11f1a3e7ec864e7fcb7f9e7eec64b5b820793d22b5ee74c6bf31df19` REDEEM，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x888888886619275d33c00d3bc62df94d700dcd42`，命中已知合约=是，通过 log 地址命中=是
- `0x88e1961858bd1cb7b67861a1558bd8bd9eaa95dabadde2008c2addd96cb05587` REDEEM，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x888888886619275d33c00d3bc62df94d700dcd42`，命中已知合约=是，通过 log 地址命中=是
- `0x214ca794ffa7a80492ce6526e92a661298ac7605d07383a7d38659892ce8b16c` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x0000000071727de22e5e9d8baf0edac6f37da032`，命中已知合约=是，通过 log 地址命中=是
- `0x6ade6e68c052d4b4f895aca3431d55a3dead8285428ac86c067c120a88732d45` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x0000000071727de22e5e9d8baf0edac6f37da032`，命中已知合约=是，通过 log 地址命中=是
- `0xc43dc32576656f2370b953e73a57e5f42f6f520db741680f313068f356b57845` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x0000000071727de22e5e9d8baf0edac6f37da032`，命中已知合约=是，通过 log 地址命中=是
- `0x1a0828359b594a433e5b898523935ca604a5c4c3ef15a197b3577edd6cd2df52` MINT，市场 `0x7B2312474c91593ee01b96CCa7a9a9CDAa8Ba000`，目标 `0x0000000071727de22e5e9d8baf0edac6f37da032`，命中已知合约=是，通过 log 地址命中=是

## 后续必要动作

- 解决 PowerCurve 官方文档/GitHub 地址不一致问题；分别看待官方文档表里的旧版曲线和 GitHub 的 PowerCurve。
- ABI 必须从官方源码或 BscScan 已验证源码生成，不能手写猜测。

## 来源

- 官方部署文档：https://docs.42.space/for-developers/deployments.md
- 官方 GitHub 部署文件：https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/deployments/56-core.json
- Router 源码：https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/FTRouterV2.sol
- Lens 源码：https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/lens/FTLensV2.sol
- Controller 源码：https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/controllerv2/FTControllerV2.sol
