# 阶段 5：受门禁保护的实盘广播核心

阶段 5 增加 core 内部签名与广播函数，但故意不暴露到面板或公开 API。

## 已新增

- core 中的 `executePreparedPlan`：
  - 接收完整准备好的 `ExecutionPlan`
  - 所有实盘门禁通过前拒绝执行
  - 校验 `PRIVATE_KEY` 推导地址是否等于配置的 `WALLET_ADDRESS`
  - 只提交必要交易
  - 可选择等待 receipt
  - 返回结构化执行结果，供后续交易账本（journal）使用
- 广播门禁：
  - `LIVE_TRADING=true`
  - `KILL_SWITCH=false`
  - 已配置 `BSC_HTTP_RPC`
  - 已配置 `PRIVATE_KEY`
  - `WALLET_ADDRESS` 有效且与私钥匹配
  - `LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_42BOT_LIVE_RISK`
  - 协议门禁 `liveReady=true`
  - 风控门禁允许
  - quote 通过
  - 余额检查通过
  - 每笔必要交易通过 `eth_call`
  - 每笔必要交易通过 gas 估算
- 面板文案现在根据执行计划展示广播状态为 `blocked` 或 `ready`。

## 重要边界

当前仍没有任何 API 端点或面板按钮可以触发真实交易。这是刻意设计，因为当时面板/API 还没有完整鉴权、CSRF 保护、操作者审计日志和人工确认工作流。

## 验证

已运行命令：

```bash
npm run verify
```

重点测试覆盖：

- 默认阻断路径
- 协议未就绪阻断路径
- 缺少确认短语阻断路径
- 已设置确认短语但未通过 preflight 的阻断路径
- 使用注入 fake client 的完整门禁 mock 提交路径

## 实盘前仍阻断

- 未实现 API/面板实盘交易入口。
- 未实现操作者确认工作流。
- 当时交易账本（journal）和 PnL 持久化尚未实现。
- 协议报告需先处理关键警告，达到 `liveReady=true`。
- 暴露任何控制面前仍需 VPS 鉴权与反向代理保护。
