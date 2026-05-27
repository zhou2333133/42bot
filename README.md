# 42bot

42space Event Token 小额实盘狙击机器人。

当前阶段目标是建立安全、可维护、可观察的工程骨架：官方 REST 新盘发现、策略评分、风控判断、quote、执行前 dry-run/preflight、API 和面板。真实交易执行必须先完成最新市场交易 trace、BscScan 源码/ABI 双重确认，并显式开启 `LIVE_TRADING=true`。

## 本地启动

```bash
npm install
npm run verify
npm run dev:api
npm run dev:dashboard
```

复制 `.env.example` 为 `.env` 后再配置 RPC、钱包和限额。不要把真实私钥提交进仓库。

API 默认监听 `http://localhost:4210`，面板默认监听 `http://localhost:4220`。Phase 1 只使用官方 REST API，不签名、不授权、不发交易。

执行计划接口：

```bash
curl "http://localhost:4210/execution/plan?marketAddress=0x...&tokenId=1&amountUsdt=3&slippageBps=500"
```

该接口只返回风险、协议、quote、gas、交易 calldata 和阻断原因；API/面板当前不会签名或广播。

手动小额实盘 CLI：

```bash
npm run live:buy -- --market 0x... --tokenId 1 --amountUsdt 3 --slippageBps 500
```

不带 `--execute` 时只生成计划并写 journal；带 `--execute` 时仍必须通过所有 live gate 才会广播。

## 阶段说明

- Phase 0: 项目约束、协议事实边界和 Git 仓库初始化。
- Phase 1: 只读市场监控、策略评分、状态文件、API、dashboard 和 Docker Compose。
- Phase 2: 最新市场交易 trace、BscScan 验证源码/ABI、官方合约仓库交叉验证。
- Phase 3: quote + `eth_call` + 交易编码，默认 dry-run，被硬风控拦截。
- Phase 4: 执行前 dry-run/preflight，API 和面板展示 quote、gas、tx plan 和阻断原因。
- Phase 5: core 内部实盘广播函数和硬门禁；暂不暴露 API/面板交易入口。
- Phase 6: VPS/API 安全加固、token 鉴权、Docker healthcheck 和部署 runbook。
- Phase 7: JSON 交易账本、持仓汇总和面板 PnL 摘要。
- Phase 8: 协议 gate 精细化，区分 blocking/nonblocking checks，当前关键路径 `liveReady=true`。
- Phase 9: 手动 live-buy CLI，复用所有 gate，成功/失败/阻断都写 journal。
- Phase 10: J/U 级别小额实盘观察、自动退出和更完整的持仓数量核算。

阶段记录：

- [docs/phase-1.md](docs/phase-1.md)
- [docs/phase-2.md](docs/phase-2.md)
- [docs/phase-3.md](docs/phase-3.md)
- [docs/phase-4.md](docs/phase-4.md)
- [docs/phase-5.md](docs/phase-5.md)
- [docs/phase-7.md](docs/phase-7.md)
- [docs/phase-8.md](docs/phase-8.md)
- [docs/phase-9.md](docs/phase-9.md)
- [docs/protocol-verification-latest.md](docs/protocol-verification-latest.md)
- [docs/vps-deploy.md](docs/vps-deploy.md)

## 阶段门禁

- `npm run verify` 必须通过后才提交阶段代码。
- 真实交易路径必须具备 quote、`eth_call` 预演、限额、滑点和熔断。
- 合约地址和 ABI 不得在未完成最新交易 trace + BscScan 验证前用于实盘。
