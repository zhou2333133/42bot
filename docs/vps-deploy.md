# VPS 部署运行手册

本手册用于小额私有 VPS 部署。不要在没有鉴权和防火墙规则的情况下暴露任何实盘交易控制面。

## 1. 克隆与安装

```bash
git clone https://github.com/zhou2333133/42bot.git
cd 42bot
cp .env.example .env
npm install
npm run verify
```

## 2. 配置 `.env`

观察模式最小配置：

```bash
API_AUTH_TOKEN=<生成一个足够长的随机 token>
CORS_ORIGIN=http://你的-vps-ip:4220
VITE_API_AUTH_TOKEN=<仅私有面板使用，通常与 API_AUTH_TOKEN 相同>
LIVE_TRADING=false
KILL_SWITCH=true
```

任何实盘测试前，还需要配置：

```bash
BSC_HTTP_RPC=<私有或付费 BSC HTTP RPC>
BSC_WS_RPC=<私有或付费 BSC WebSocket RPC>
WALLET_ADDRESS=<专用小额热钱包地址>
PRIVATE_KEY=<专用小额热钱包私钥>
JOURNAL_FILE=./data/journal.json
MAX_TRADE_USDT=3
DAILY_MAX_USDT=10
MAX_OPEN_POSITIONS=1
MAX_SLIPPAGE_BPS=500
MAX_GAS_GWEI=5
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_42BOT_LIVE_RISK
```

在真正测试的那一刻之前，保持 `KILL_SWITCH=true`。不要把私钥、RPC token、API token 粘贴到聊天、文档、截图或提交记录里。

## 3. 协议核验

```bash
npm run verify:protocol
```

广播前，`data/protocol-verification-latest.json` 必须显示 `liveReady=true`。如果有阻断性协议证据未解决，应视为真实资金阻断项。

## 4. Docker Compose

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api bot dashboard
```

健康检查：

- API：`http://127.0.0.1:4210/health`
- 面板：`http://127.0.0.1:4220/`

受保护的 API 请求需要：

```bash
Authorization: Bearer <API_AUTH_TOKEN>
```

`VITE_API_AUTH_TOKEN` 会被打包进面板前端。只在防火墙或反向代理保护下的私有面板使用它；如果面板可被公网访问，不要把它当成真正秘密。

## 5. 防火墙与暴露面

建议：

- `4210` 只允许 localhost 或你的可信 IP 访问。
- `4220` 只放在 HTTPS 反向代理和基础认证之后。
- 不要公开暴露任何未来交易端点。
- 使用只存 J/U 测试资金的专用热钱包。

## 6. 实盘测试前清单

第一笔小额交易前：

- `npm run verify` 通过。
- `npm run verify:protocol` 返回 `liveReady=true`。
- 面板执行 dry-run 显示 `preconditionsReady=true`。
- 广播状态显示 `ready`，但没有任何 API 交易端点暴露。
- 钱包余额只放测试金额。
- `MAX_TRADE_USDT` 和 `DAILY_MAX_USDT` 都非常小。
- 只在测试窗口内设置 `KILL_SWITCH=false`。
- 测试结束后立刻改回 `KILL_SWITCH=true`。

## 7. 手动 J/U Live Buy

先运行不带 `--execute` 的计划模式：

```bash
npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --reason "first J/U test"
```

检查打印出的 JSON：

- `preconditionsReady` 必须为 `true`。
- `broadcastReady` 必须为 `true`。
- `blockedReasons` 必须为空，或只包含非阻断协议备注。
- 必要交易必须显示 `call=passed` 和 `gas=passed`。

确认无误后，再运行显式执行命令：

```bash
npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --reason "first J/U test" --execute
```

命令会把结果写入 `JOURNAL_FILE`。测试后检查：

```bash
docker compose logs --tail=200 bot
curl -H "Authorization: Bearer $API_AUTH_TOKEN" http://127.0.0.1:4210/journal
```

然后重新设置 `KILL_SWITCH=true`。
