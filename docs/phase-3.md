# 阶段 3：Quote 与交易构造器

阶段 3 增加非广播执行基础：

- 从官方 42 源码签名转写最小 ABI 片段。
- 基于 Lens 的 mint/redeem quote helper，使用 `eth_call` 模拟。
- Router `swapMarketV2` calldata 构造器。
- 精确金额 BUSDT approve 交易构造器。
- 为后续卖出路径准备 ERC6909 `setOperator` 构造器。
- 执行就绪门禁，除非以下条件全部满足，否则阻止签名：
  - `LIVE_TRADING=true`
  - 已配置 `BSC_HTTP_RPC`
  - `WALLET_ADDRESS` 有效
  - 环境变量中存在 `PRIVATE_KEY`
  - 协议核验报告为 `liveReady=true`
  - 风控引擎允许该交易

## 验证

已运行命令：

```bash
npm run verify
```

结果：

- 类型检查通过。
- 6 个测试文件通过。
- 15 个测试通过。
- core、API、bot、面板、协议核验器构建通过。

只读链上冒烟检查：

- 仅使用公共 BNB Chain RPC 执行 `eth_call`。
- 对市场 `0x3d3d1c0d338Ff5B645d0AC7772Fe45B85F93E3A2` 做了 1 USDT mint quote。
- `FTLensV2.simulateMint` 返回有效 quote，并生成滑点调整后的 `minOtOut`。
- 未执行签名、approve 或交易广播。

## 实盘前仍阻断

- ABI 必须从官方源码生成，或从 BscScan 已验证合约导出。
- 必须配置专用钱包和私有 RPC，不能把私钥发到聊天里。
- 应记录最新市场调用路径的 BscScan/manual trace。
- 执行模块仍需要 nonce/gas/preflight receipt 处理，以及首批 J/U 交易的人工确认路径。
