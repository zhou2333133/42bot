# 阶段 8：协议门禁精细化

阶段 8 改进协议核验逻辑，让实盘就绪状态基于真实执行关键路径判断。

## 变更内容

- 每个协议检查项都增加 `blocksLiveExecution`。
- `liveReady` 只要求所有阻断性检查通过。
- 非阻断警告仍然显示，但不阻断小额买入路径预演。
- PowerCurve 文档/GitHub 不一致仍保留为非阻断警告，因为当前买入路径使用 Router/Lens quote 与 swap 预演，不直接调用 curve。
- 交易回执检查现在同时检查：
  - 交易 `to`
  - 交易回执日志地址
- 这可以覆盖 Binance Wallet/account-router 风格交易：`tx.to` 是账户或聚合合约，但 logs 里仍包含 42 market/router 路径。

## 最新结果

生成时间：`2026-05-27T04:28:25.665Z`

- `liveReady=true`
- 通过：22
- 警告：1
- 失败：0
- 实盘阻断未解决项：0
- 非阻断警告：1
- 交易回执检查通过日志地址命中 12/12 条已知 router/controller/market 路径

## 剩余警告

`compare.docsGithub.PowerCurve` 仍未解决：

- 文档旧版 PowerCurve: `0x0443E04e70E4285a6cA73eacaC5267f3B4cBb7Da`
- GitHub PowerCurve: `0xDC26047458FEa8Bd45164217CCb7eE90b9bE10B8`

在人工确认前，不要基于任何一个 PowerCurve 地址构建曲线专用逻辑。当前执行路径只允许通过 Router/Lens 预演前进。

## 验证

已运行命令：

```bash
$env:BSC_HTTP_RPC='https://bsc-dataseed.binance.org'; npm run verify:protocol
npm run verify
npm audit --audit-level=moderate
```
