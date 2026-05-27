# 42bot

42space Event Token 小额实盘狙击机器人。

当前阶段目标是建立安全、可维护、可观察的工程骨架：官方 REST 新盘发现、策略评分、风控判断、API 和面板。真实交易执行必须先完成最新市场交易 trace、BscScan 源码/ABI 双重确认，并显式开启 `LIVE_TRADING=true`。

## 本地启动

```bash
npm install
npm run verify
npm run dev:api
npm run dev:dashboard
```

复制 `.env.example` 为 `.env` 后再配置 RPC、钱包和限额。不要把真实私钥提交进仓库。

API 默认监听 `http://localhost:4210`，面板默认监听 `http://localhost:4220`。Phase 1 只使用官方 REST API，不签名、不授权、不发交易。

## 阶段说明

- Phase 0: 项目约束、协议事实边界和 Git 仓库初始化。
- Phase 1: 只读市场监控、策略评分、状态文件、API、dashboard 和 Docker Compose。
- Phase 2: 最新市场交易 trace、BscScan 验证源码/ABI、官方合约仓库交叉验证。
- Phase 3: quote + `eth_call` + 交易编码，默认 dry-run，被硬风控拦截。
- Phase 4: J/U 级别小额实盘，逐笔日志、面板 PnL、熔断和人工确认。

详见 [docs/phase-1.md](docs/phase-1.md)。

## 阶段门禁

- `npm run verify` 必须通过后才提交阶段代码。
- 真实交易路径必须具备 quote、`eth_call` 预演、限额、滑点和熔断。
- 合约地址和 ABI 不得在未完成最新交易 trace + BscScan 验证前用于实盘。
