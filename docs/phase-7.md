# 阶段 7：交易账本与 PnL 汇总

阶段 7 增加第一版持久化交易账本。这里先使用简单 JSON 存储，方便在 VPS 上直接检查。

## 已新增

- `JsonJournalStore`
  - 读取并追加交易账本记录
  - 数据存储在 `JOURNAL_FILE`
- 账本记录辅助函数：
  - 从执行计划生成 planned/blocked 记录
  - 从执行结果生成 submitted/confirmed/failed 记录
- 汇总计算：
  - 按状态统计记录数
  - buy/sell USDT 总额
  - 已实现 PnL
  - 按 market/token 汇总持仓
- API 接口：
  - `GET /journal`
- 面板区域：
  - 交易账本总览
  - 最新交易记录
  - 持仓/PnL 汇总

## 验证

已运行命令：

```bash
npm run verify
```

重点交易账本测试覆盖：

- 持仓/PnL 汇总
- 从未就绪的计划生成 blocked 记录
- 从执行结果生成 submitted 记录
- JSON 持久化

## 实盘前仍阻断

- 实盘执行仍未通过 API/面板暴露。
- 交易账本追加当时尚未接入操作者确认后的实盘执行命令。
- 持仓数量核算仍是 USDT 级别；自动退出前应增加 outcome token 数量追踪。
