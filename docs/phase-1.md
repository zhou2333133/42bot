# 阶段 1：只读市场监控

阶段 1 的目标是在任何签名或实盘执行代码出现之前，先建立安全、可观察的基础能力。

## 已核验的官方输入

- 官方部署文档：`https://docs.42.space/for-developers/deployments.md`
- 官方 REST 地址：`https://rest.ft.42.space/`
- `GET /api/v1/markets` 返回分页市场元数据。
- `GET /api/v1/market-data/activity` 返回 MINT/REDEEM/FINALISE/CLAIM 活动。
- `GET /api/v1/market-data/prices` 返回当前结果 Token 价格。
- BNB Chain `chainId=56`。
- BUSDT 抵押资产：`0x55d398326f99059ff775485246999027b3197955`。

## 已实现

- `@42bot/core`：配置、官方 REST 客户端、策略评分、基础风控、JSON 状态存储。
- `@42bot/bot`：周期性 REST 轮询，并写入 `STATE_FILE`。
- `@42bot/api`：只读健康检查、快照、市场、评分、刷新接口。
- `@42bot/dashboard`：本地/VPS 面板，用于查看机器人状态、风控限制、策略评分、观察市场、活动和价格。

## 暂未实现

- 钱包签名。
- ERC20 授权。
- Router swap 调用。
- FTLens quote 调用。
- 交易 receipt 解析。
- 暂停/恢复/熔断状态持久化。

这些能力必须等阶段 2 完成当前合约地址、ABI 和最新市场交易 trace 核验后再继续。
