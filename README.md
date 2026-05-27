# 42bot 完整中文手册

42bot 是一个 42space Event Token 小额实盘狙击机器人。当前版本支持：

- 监控 42space 市场和 activity
- 对新盘/早期盘做策略评分
- 展示网页面板
- 生成买入前执行计划
- 做 quote、余额检查、gas 检查、`eth_call` 预演
- 手动 CLI 小额实盘买入
- 写入 JSON 交易账本

重要：一开始先用免费公共 BNB RPC 和 J/U 级别小金额测试。公共 RPC 适合跑通流程，不适合高速狙击。确认流程稳定后，再换成注册的免费/付费 RPC。

## 1. 策略目标

这个机器人不是传统预测市场长期持有策略，而是围绕 42space 的 Bonding Curve 做：

```text
新盘发现 -> 热度确认 -> 小额早期买入 -> 快速止盈/止损 -> 默认不持到结算
```

当前实盘入口是手动 CLI，不在网页面板放真实交易按钮。面板只做观察、策略评分、执行计划和账本展示。

## 2. 准备 VPS

系统建议：

- Ubuntu 22.04 或 24.04
- 2C2G 起步，1C1G 也能跑但 build 慢
- 硬盘 20GB+

以下命令默认你用 `root` 登录 VPS。

```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg git nano openssl
timedatectl set-timezone Asia/Hong_Kong
```

## 3. 安装 Docker

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version
docker compose version
```

## 4. 拉取项目

仓库已公开，直接 clone：

```bash
cd /opt
git clone https://github.com/zhou2333133/42bot.git
cd /opt/42bot
```

## 5. 配置 `.env`

复制配置文件：

```bash
cp .env.example .env
nano .env
```

先用免费公共 BNB RPC，填这份最小配置：

```bash
NODE_ENV=production
FORTYTWO_REST_BASE=https://rest.ft.42.space

BSC_HTTP_RPC=https://bsc-dataseed.binance.org
BSC_WS_RPC=

LIVE_TRADING=false
KILL_SWITCH=true

API_HOST=0.0.0.0
API_PORT=4210
API_AUTH_TOKEN=<随机登录 token>
CORS_ORIGIN=

STATE_FILE=./data/state.json
JOURNAL_FILE=./data/journal.json
PROTOCOL_REPORT_JSON_PATH=./data/protocol-verification-latest.json

MAX_TRADE_USDT=3
DAILY_MAX_USDT=10
MAX_OPEN_POSITIONS=1
MAX_SLIPPAGE_BPS=500
MAX_GAS_GWEI=5
LIVE_TRADING_CONFIRMATION=
```

生成面板登录 token：

```bash
openssl rand -hex 32
```

把输出填到：

```bash
API_AUTH_TOKEN=这里填刚生成的值
```

实盘前再填钱包：

```bash
WALLET_ADDRESS=<专用小额热钱包地址>
PRIVATE_KEY=<专用小额热钱包私钥>
```

不要用主钱包。这个钱包只放 J/U 级别测试资金和少量 BNB gas。

## 6. 启动机器人

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api bot dashboard
```

默认访问：

- 面板：`http://你的VPS-IP:4220`
- API：`http://你的VPS-IP:4210`

打开面板后：

1. API 地址填 `http://你的VPS-IP:4210`
2. API Token 填 `.env` 里的 `API_AUTH_TOKEN`
3. 登录一次后浏览器会记住

如果改了 `API_AUTH_TOKEN`，重启容器后在面板右上角退出，再输入新 token。

## 7. 基础检查

在 VPS 上执行：

```bash
source .env
curl http://127.0.0.1:4210/health
curl -H "Authorization: Bearer $API_AUTH_TOKEN" http://127.0.0.1:4210/snapshot
curl -H "Authorization: Bearer $API_AUTH_TOKEN" http://127.0.0.1:4210/journal
```

如果返回 JSON，说明 API 正常。

## 8. 协议核验

协议核验会检查官方 42space 部署文档、官方合约仓库、源码关键函数、近期交易回执。

```bash
npm install
npm run verify:protocol
```

输出里必须看到：

```text
"liveReady": true
```

报告会写到：

```text
data/protocol-verification-latest.md
data/protocol-verification-latest.json
```

如果 `liveReady=false`，不要做实盘。

## 9. 第一次小额实盘前检查

确认 `.env`：

```bash
BSC_HTTP_RPC=https://bsc-dataseed.binance.org
WALLET_ADDRESS=<专用小额热钱包地址>
PRIVATE_KEY=<专用小额热钱包私钥>
LIVE_TRADING=true
KILL_SWITCH=false
MAX_TRADE_USDT=3
DAILY_MAX_USDT=10
MAX_OPEN_POSITIONS=1
MAX_SLIPPAGE_BPS=500
MAX_GAS_GWEI=5
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_42BOT_LIVE_RISK
```

重启容器让配置生效：

```bash
docker compose up -d --build
```

钱包里只放测试资金，例如：

- 3-10 USDT
- 少量 BNB 作为 gas

## 10. 找一个市场和 tokenId

在面板里看候选市场，或从 API 拉市场：

```bash
source .env
curl -H "Authorization: Bearer $API_AUTH_TOKEN" http://127.0.0.1:4210/snapshot > snapshot.json
```

从 `snapshot.json` 里找：

- `market.address`
- `outcomes[].tokenId`

先选小额测试，不要追高，不要 all-in。

## 11. 先生成计划，不执行

把下面命令里的 `0xMarket` 和 `tokenId` 换成真实值：

```bash
npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --reason "first public rpc J/U test"
```

不带 `--execute` 时不会发交易，只会：

- 生成执行计划
- 做 quote
- 检查余额
- 检查 gas
- 做 `eth_call`
- 写交易账本

必须确认输出满足：

- `preconditionsReady=true`
- `broadcastReady=true`
- `blockedReasons` 为空，或只包含非阻断协议备注
- 必要交易显示 `call=passed`
- 必要交易显示 `gas=passed`

如果不满足，不要加 `--execute`。

## 12. 小额执行

确认计划无误后，再执行：

```bash
npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --reason "first public rpc J/U test" --execute
```

执行后查看：

```bash
cat data/journal.json
docker compose logs --tail=200 bot
```

测试结束后立刻恢复熔断：

```bash
sed -i 's/^KILL_SWITCH=false/KILL_SWITCH=true/' .env
docker compose up -d --build
```

## 13. 注册免费 BNB RPC

公共 RPC 能跑通流程，但不稳定、限速、延迟也高。小额流程确认后建议注册一个免费 RPC。

### 方案 A：QuickNode

1. 打开 `https://www.quicknode.com/`
2. 注册账号
3. 创建 Endpoint
4. Chain 选择 `BNB Smart Chain` 或 `BNB Chain`
5. Network 选择 Mainnet
6. 复制 HTTPS RPC URL
7. 填到 `.env`

```bash
BSC_HTTP_RPC=<QuickNode HTTPS URL>
```

如果 QuickNode 提供 WSS URL，也填：

```bash
BSC_WS_RPC=<QuickNode WSS URL>
```

### 方案 B：Ankr

1. 打开 `https://www.ankr.com/rpc/`
2. 注册账号
3. 创建 BNB Chain RPC
4. 复制 HTTPS RPC URL
5. 填到 `.env`

```bash
BSC_HTTP_RPC=<Ankr HTTPS URL>
```

换 RPC 后重新核验：

```bash
npm run verify:protocol
docker compose up -d --build
```

## 14. 更新代码

```bash
cd /opt/42bot
git pull
docker compose up -d --build
docker compose ps
```

如果依赖变化：

```bash
npm install
npm run verify
```

## 15. 常用排错

查看服务：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f api bot dashboard
```

重启：

```bash
docker compose restart
```

完全重建：

```bash
docker compose down
docker compose up -d --build
```

查看端口：

```bash
ss -lntp | grep -E '4210|4220'
```

查看账本：

```bash
cat data/journal.json
```

## 16. 安全底线

- `.env` 不进 Git。
- 私钥只放 VPS 的 `.env`。
- 不要把私钥、RPC token、API token 发到聊天或截图。
- 实盘只用专用小额热钱包。
- 没测试时保持 `KILL_SWITCH=true`。
- 单笔先用 1-3 USDT。
- 公共 RPC 只用于跑通流程，不用于高频狙击。

## 17. 官方参考

- BNB Chain RPC 文档：`https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/`
- 42space 官方 REST：`https://rest.ft.42.space`
- 42space 部署文档：`https://docs.42.space/for-developers/deployments.md`
- 42space 官方合约仓库：`https://github.com/fortytwo-protocol/ft-contracts-public`
