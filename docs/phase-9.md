# 阶段 9：手动实盘买入 CLI

阶段 9 增加第一次 J/U 小额实盘测试使用的手动终端入口。

## 已新增

- 根目录脚本：
  - `npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500`
- bot workspace 脚本：
  - `npm --workspace @42bot/bot run live:buy -- ...`
- CLI 行为：
  - 不带 `--execute` 时，只生成计划并写入交易账本（journal）
  - 带 `--execute` 时，调用受门禁保护的 broadcaster
  - 成功、阻断、失败都会写入交易账本（journal）
  - 默认等待 receipt
  - `--no-wait` 会在拿到交易 hash 后返回

## 安全属性

CLI 复用所有现有门禁：

- `LIVE_TRADING=true`
- `KILL_SWITCH=false`
- 已配置私有 RPC
- 已配置钱包
- 私钥与钱包地址匹配
- 已配置精确确认短语
- 协议门禁 `liveReady=true`
- 风控限额通过
- quote 通过
- 余额检查通过
- 每笔必要交易通过 `eth_call`
- 每笔必要交易通过 gas 估算

它不会暴露到 API 或面板。

## 验证

在本地未配置实盘参数时运行冒烟检查命令：

```bash
npm run live:buy -- --market 0x0000000000000000000000000000000000000002 --tokenId 1 --amountUsdt 1 --slippageBps 500
```

预期结果：

- 生成执行计划
- 不生成交易
- 因缺少实盘配置/RPC/钱包/确认短语被阻断
- blocked 记录写入交易账本（journal）
- 退出码为 2
