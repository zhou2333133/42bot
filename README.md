# 42bot

42space Event Token 小额实盘狙击机器人。

当前目标是建立安全、可维护、可观察的工程骨架：官方 REST 新盘发现、策略评分、风控判断、quote、执行前 dry-run/preflight、API 和面板。真实交易执行必须先完成最新市场交易 trace、BscScan 源码/ABI 双重确认，并显式开启 `LIVE_TRADING=true`。

## 本地启动

```bash
npm install
npm run verify
npm run dev:api
npm run dev:dashboard
```

复制 `.env.example` 为 `.env` 后再配置 RPC、钱包和限额。不要把真实私钥提交进仓库。

API 默认监听 `http://localhost:4210`，面板默认监听 `http://localhost:4220`。默认不签名、不授权、不发交易。

执行计划接口：

```bash
curl "http://localhost:4210/execution/plan?marketAddress=0x...&tokenId=1&amountUsdt=3&slippageBps=500"
```

该接口只返回风险、协议、quote、gas、交易 calldata 和阻断原因；API/面板当前不会签名或广播。

手动小额实盘 CLI：

```bash
npm run live:buy -- --market 0x... --tokenId 1 --amountUsdt 3 --slippageBps 500
```

不带 `--execute` 时只生成计划并写交易账本（journal）；带 `--execute` 时仍必须通过所有实盘门禁才会广播。

## 阶段说明

- 阶段 0：项目约束、协议事实边界和 Git 仓库初始化。
- 阶段 1：只读市场监控、策略评分、状态文件、API、面板和 Docker Compose。
- 阶段 2：最新市场交易 trace、BscScan 验证源码/ABI、官方合约仓库交叉验证。
- 阶段 3：quote + `eth_call` + 交易编码，默认 dry-run，被硬风控拦截。
- 阶段 4：执行前 dry-run/preflight，API 和面板展示 quote、gas、tx plan 和阻断原因。
- 阶段 5：core 内部实盘广播函数和硬门禁；暂不暴露 API/面板交易入口。
- 阶段 6：VPS/API 安全加固、token 鉴权、Docker healthcheck 和部署手册。
- 阶段 7：JSON 交易账本、持仓汇总和面板 PnL 摘要。
- 阶段 8：协议门禁精细化，区分阻断/非阻断检查，当前关键路径 `liveReady=true`。
- 阶段 9：手动 live-buy CLI，复用所有门禁，成功/失败/阻断都写交易账本（journal）。
- 阶段 10：J/U 级别小额实盘观察、自动退出和更完整的持仓数量核算。

阶段记录：

- [阶段 1：只读市场监控](docs/phase-1.md)
- [阶段 2：协议核验门禁](docs/phase-2.md)
- [阶段 3：Quote 与交易构造器](docs/phase-3.md)
- [阶段 4：执行前干运行/预演](docs/phase-4.md)
- [阶段 5：受门禁保护的实盘广播核心](docs/phase-5.md)
- [阶段 7：交易账本与 PnL 汇总](docs/phase-7.md)
- [阶段 8：协议门禁精细化](docs/phase-8.md)
- [阶段 9：手动实盘买入 CLI](docs/phase-9.md)
- [最新协议核验报告](docs/protocol-verification-latest.md)
- [VPS 部署运行手册](docs/vps-deploy.md)

## 阶段门禁

- `npm run verify` 必须通过后才提交阶段代码。
- 真实交易路径必须具备 quote、`eth_call` 预演、限额、滑点和熔断。
- 合约地址和 ABI 不得在未完成最新交易 trace + BscScan 验证前用于实盘。
