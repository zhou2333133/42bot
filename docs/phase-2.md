# 阶段 2：协议核验门禁

阶段 2 增加可重复运行的协议核验门禁，任何实盘执行路径都必须先经过这一步。

## 命令

```bash
npm run verify:protocol
```

该命令会写入：

- 人类可读报告：`docs/protocol-verification-latest.md`
- 机器可读报告：`data/protocol-verification-latest.json`

`data/` 仍然被 Git 忽略，因为 JSON 报告每次运行都会变化。Markdown 报告会提交进仓库，作为最近一次已审阅证据。

## 核验内容

- 官方部署页面包含预期的 BNB Chain 地址。
- 官方 GitHub `deployments/56-core.json` 存在，并声明 `chainId=56`。
- Router、Controller V2、Lens V2 地址在官方文档和官方 GitHub 部署数据之间一致。
- 官方源码包含关键函数名：
  - `FTRouterV2.swapMarketV2`
  - `FTRouterV2.claimAllSimple`
  - `FTLensV2.simulateMint`
  - `FTLensV2.simulateRedeem`
  - `FTLensV2.snapshotMarket`
  - Controller 市场生命周期函数
- 能从官方 REST 的市场维度 activity 中发现近期市场活动。

## 当前门禁结果

最初提交的阶段 2 报告中，实盘执行尚未就绪。

当时的阻断项：

- `BSC_HTTP_RPC` 未配置，因此无法检查近期交易 receipt。
- `PowerCurve` 在官方文档和 GitHub 部署数据中存在差异：文档列出旧版曲线，GitHub 同时列出 `PowerCurveLegacy` 和较新的 `PowerCurve`。

后续阶段已将核验逻辑细化。请以 [最新协议核验报告](protocol-verification-latest.md) 为准。

## 进入实盘前仍需满足

- 在 `.env` 中配置 BNB Chain HTTP RPC。
- 重新运行 `npm run verify:protocol`。
- 手动检查至少一笔最新市场 MINT 交易的 BscScan trace，确认实际 Router/market 调用路径。
- ABI 必须从官方源码或 BscScan 已验证合约生成，不能手写猜测。
