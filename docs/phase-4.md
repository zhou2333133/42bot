# 阶段 4：执行前干运行/预演

阶段 4 增加可观察的执行计划门禁。该阶段仍不签名、不广播交易。

## 已新增

- core 中的 `buildExecutionPlan`：
  - 评估风控限额和熔断开关
  - 加载协议核验门禁
  - 检查当前 gas price 是否超过 `MAX_GAS_GWEI`
  - RPC 已配置时请求 Lens quote
  - 检查 BUSDT / outcome 余额
  - 构造精确 BUSDT approve + Router buy swap 交易
  - 为后续持仓模块构造 sell-path operator + Router sell swap 交易
  - 对每笔必要交易执行 `eth_call` 和 gas 估算
  - 阶段 4 返回非广播执行计划；阶段 5 增加受门禁保护的 core 广播器，但不暴露到 API/面板
- API 接口：
  - `GET /execution/plan?marketAddress=...&tokenId=...&amountUsdt=...&slippageBps=...`
- 面板区域：
  - 风控/就绪/quote/gas/前置条件/广播状态
  - 必要交易计划
  - 阻断原因
- 配置加固：
  - `KILL_SWITCH=true` 默认开启
  - npm workspace 进程中的状态文件和报告路径按项目根目录解析

## 验证

已运行命令：

```bash
npm run verify
npm run verify:protocol
npm audit --audit-level=moderate
```

结果：

- 类型检查通过。
- 7 个测试文件通过。
- 18 个测试通过。
- core、API、bot、面板、协议核验器构建通过。
- 依赖审计未发现 moderate 或更高等级漏洞。
- 协议核验：22 项通过，1 项警告，0 项失败，`liveReady=false`。

手动冒烟检查：

- API `/health` 返回 200。
- API `/execution/plan` 返回被协议/风控/RPC 原因阻断的 dry-run 计划。
- 面板在 `http://localhost:4220` 正常加载。
- 浏览器冒烟检查确认：
  - 策略评分区域可见。
  - 观察市场区域可见。
  - 执行干运行区域可见。
  - dry-run 按钮可用。
  - 点击后返回阻断状态，没有 execution-plan 错误。

## 实盘前仍阻断

- 默认 `LIVE_TRADING=false`。
- 默认 `KILL_SWITCH=true`。
- 未配置 `PRIVATE_KEY`、`WALLET_ADDRESS` 和私有 RPC。
- 当时协议报告仍为 `liveReady=false`，原因是 PowerCurve 文档/GitHub 不一致。
- 阶段 4 故意不实现签名和广播。
- 卖出路径需要真实持仓索引后才能作为用户动作暴露。
