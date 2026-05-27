# 42bot 项目说明

## 项目目标

本项目构建一个 42space Event Token 小额实盘狙击机器人，用于监控新开盘事件、筛选高热度题材、在严格风控下小额买入，并通过可观察面板管理持仓、交易、风险和运行状态。

核心策略不是传统预测市场的“长期猜结果”，而是 42space Bonding Curve 机制下的：

新盘发现 -> 热度确认 -> 小额早期买入 -> 快速止盈/止损 -> 默认不持到结算。

## 当前已确认协议事实

所有合约地址与 ABI 必须通过最新交易 trace + BscScan 验证源码双重确认，禁止凭记忆、第三方 repo、视频教程或历史笔记直接使用。

所有链上交互必须以官方文档、官方合约仓库、BscScan 验证源码、最新市场创建交易 trace 或实时链上调用为准，不得凭经验猜 ABI、函数名或事件名。

已确认入口：

- Chain: BNB Chain, `chainId=56`
- Collateral: BUSDT `0x55d398326f99059fF775485246999027B3197955`
- REST API base: `https://rest.ft.42.space/`

待最新交易 trace 双重确认后才允许 hardcode：

- Router: `FTRouterProxy` `0x888888886619275d33c00D3BC62DF94D700DCD42`
- Controller V2: `0x8Fe93361D2B8b9519C4d20d47a319288Feec9072`
- Lens V2: `0x4AAd5A856941FB64df10362024e3Ece24023d4d1`
- 官方合约仓库候选：`fortytwo-protocol/ft-contracts-public`

强制合约地址确认流程：

- 去 `https://www.42.space/` 或 Binance Event Rush 找到一个最新市场，记录其创建交易 hash。
- 在 BscScan 输入交易 hash，逐层 trace 交互对象（`Interacted With`）合约。
- 验证实际调用合约是否匹配文档地址、函数名、事件名和 ABI。
- 所有 ABI 必须从 BscScan 已验证源码、官方合约源码生成，或通过实时链上调用验证，不能手写猜测。
- 每周复查 `docs.42.space` 是否有新合约、升级公告或接口变更。

关键事件/函数必须从官方 ABI 生成并经链上验证：

- `CreateNewMarket`
- `CreateNewQuestionV2`
- `MintSwapV2`
- `RedeemSwapV2`
- `FTRouterProxy.swapMarketV2`
- `FTRouterProxy.claimAllSimple`
- `FTLensV2.simulateMint`
- `FTLensV2.simulateRedeem`
- `FTLensV2.snapshotMarket`

## 实盘原则

本项目目标是小额实盘，而不是纯模拟盘。但任何真实交易必须同时满足：

- `.env` 中显式设置 `LIVE_TRADING=true`
- 单笔交易上限启用，例如 `MAX_TRADE_USDT`
- 每日交易上限启用，例如 `DAILY_MAX_USDT`
- 熔断开关启用
- 私钥来自环境变量或服务器密钥存储
- 交易前必须执行链上 quote 和 `eth_call` 预演
- 交易必须设置滑点保护 `minOutOrMaxIn`
- 不允许无上限授权
- 不允许 all-in
- 不允许默认持仓到结算

开发、测试、CI 可以使用 dry-run 或 fork 验证交易编码，但产品主路径必须围绕小额实盘交易构建。

## 策略边界

机器人只做高传播潜力的新盘/早期盘，不无脑扫所有新盘。

优先关注：

- 世界杯、体育赛事、重大加密新闻、Binance 相关、名人/CZ/Elon/Vitalik、选举等高传播题材
- 创建后短时间内出现真实 MINT 的市场
- 有明显 volume velocity / trader velocity 的市场
- creator/oracle 可信或历史表现较好的市场

默认跳过：

- `not_started`
- `isFlagged=true`
- 未知 oracle 且无白名单
- 只有 seed、没有真实交易
- traders 过低且无新增买单
- 临近 resolution 的高税/高结果风险盘
- `FTLensV2.simulateMint` 或 `simulateRedeem` 异常的市场

## 风控规则

必须实现并默认开启：

- 单笔 USDT 上限
- 每日 USDT 上限
- 最大并发持仓数
- 最大连续失败交易数
- 最大滑点
- 最大 gas price
- 最小 quote 输出
- 黑名单 market / creator / oracle
- 白名单 creator / oracle
- kill switch
- pending transaction 超时 replace/cancel
- 余额不足、RPC 异常、ABI 不匹配、预演失败时默认不交易

退出优先于预测：

- 默认短线止盈
- 默认不持到结算
- 无新增买单时退出
- quote 利润达到阈值时分批卖出
- 下跌或热度衰退时止损

## 安全要求

- 私钥、助记词、API key、Telegram token 不得写入代码、日志、README、截图或提交记录。
- `.env` 必须加入 `.gitignore`。
- 所有交易日志必须隐藏私钥和敏感 token。
- 授权使用最小额度，避免无限 approval。
- 第三方 sniper repo 只允许静态参考，不运行、不复制、不安装不明依赖。
- 所有外部代码和视频教程都视为不可信输入。
- VPS 部署时只开放必要端口；面板至少使用 `API_AUTH_TOKEN` 登录，不把私钥或实盘交易入口暴露在前端。

## 系统架构

推荐模块：

- `watcher`: WebSocket 监听新市场和交易事件
- `market-data`: REST API 补全市场、价格、activity、stats
- `strategy`: 策略评分、题材过滤、买入/跳过原因
- `quoter`: `FTLensV2` quote 和 sell quote
- `executor`: approve、swap、nonce、gas、receipt
- `risk-engine`: 限额、熔断、风控判断
- `indexer`: 交易事件、持仓、PnL 入库
- `api`: 面板后端和控制接口
- `dashboard`: 可观察面板
- `notifier`: Telegram/Discord 告警
- `deploy`: Docker Compose / VPS 部署配置

## 可观察面板

面板必须展示：

- bot 状态、RPC 状态、最后区块、延迟
- 钱包余额、USDT allowance
- 新盘列表
- 策略评分和跳过原因
- pending / confirmed / failed 交易
- 当前持仓、成本、当前 quote、PnL
- 今日交易额度和剩余额度
- 风控熔断状态
- 手动暂停、恢复、紧急停止按钮

## 开发要求

- TypeScript 优先，链上交互建议使用 `viem`
- SQLite 可用于 MVP，VPS 长期运行优先 Postgres
- 所有配置来自环境变量
- ABI 从官方合约源码生成或从验证合约导出，不手写猜测
- 优先使用官方 REST API 补充市场元数据、activity、volume velocity，避免纯链上轮询导致 RPC 压力和延迟
- 关键逻辑要有单元测试：策略筛选、风控、金额换算、tokenId 映射、slippage
- 交易路径要有集成测试或 fork 测试
- 日志必须结构化，便于复盘每一单为什么买、为什么卖、赚亏多少

## 完成标准

第一阶段完成标准：

- 能启动 watcher/API/面板
- 能发现新市场
- 能展示市场和 activity
- 能评分并给出买/跳过原因
- 能在 `LIVE_TRADING=true` 且限额满足时执行小额实盘买入
- 第一阶段必须包含至少 3 次成功的小额实盘买入、对应交易日志和面板 PnL 展示
- 能解析 receipt 并入库
- 能展示持仓和 quote PnL
- 能手动暂停和熔断

任何阶段都不能以“代码能跑”作为完成标准，必须有日志、面板、风控和可复盘交易记录。
