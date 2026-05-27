# Ubuntu VPS 简化部署手册

本手册面向一台 Ubuntu VPS。仓库按公开仓库处理，直接 `git clone`。面板打开后输入一次 `API_AUTH_TOKEN` 登录，浏览器会记住。API token 是运行时输入，不会打进前端包。

这里的“面板”是 42bot 自己的 Dashboard，不是宝塔、1Panel 或 VPS 系统管理面板。

## 1. 安装系统依赖

以下命令假设你用 `root` 登录 Ubuntu 22.04 或 24.04：

```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg git nano
```

设置时区：

```bash
timedatectl set-timezone Asia/Hong_Kong
```

## 2. 安装 Docker

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

确认安装成功：

```bash
docker --version
docker compose version
```

## 3. 拉取项目

```bash
cd /opt
git clone https://github.com/zhou2333133/42bot.git
cd /opt/42bot
```

## 4. 配置 `.env`

```bash
cp .env.example .env
nano .env
```

观察模式最小配置：

```bash
NODE_ENV=production
FORTYTWO_REST_BASE=https://rest.ft.42.space

LIVE_TRADING=false
KILL_SWITCH=true

API_HOST=0.0.0.0
API_PORT=4210
API_AUTH_TOKEN=<生成一个登录面板用的随机 token>
CORS_ORIGIN=

STATE_FILE=./data/state.json
JOURNAL_FILE=./data/journal.json
PROTOCOL_REPORT_JSON_PATH=./data/protocol-verification-latest.json
```

生成随机 token：

```bash
openssl rand -hex 32
```

把生成结果填到：

```bash
API_AUTH_TOKEN=这里填刚生成的值
```

实盘前再配置这些：

```bash
BSC_HTTP_RPC=<你的 BSC HTTP RPC>
BSC_WS_RPC=<你的 BSC WebSocket RPC>
WALLET_ADDRESS=<专用小额热钱包地址>
PRIVATE_KEY=<专用小额热钱包私钥>

MAX_TRADE_USDT=3
DAILY_MAX_USDT=10
MAX_OPEN_POSITIONS=1
MAX_SLIPPAGE_BPS=500
MAX_GAS_GWEI=5
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_42BOT_LIVE_RISK
```

真正小额测试前保持：

```bash
LIVE_TRADING=false
KILL_SWITCH=true
```

## 5. 启动机器人和面板

```bash
docker compose up -d --build
docker compose ps
```

查看日志：

```bash
docker compose logs -f api bot dashboard
```

默认端口：

- API：`http://你的VPS-IP:4210`
- 面板：`http://你的VPS-IP:4220`

打开浏览器：

```text
http://你的VPS-IP:4220
```

第一次打开会看到登录页：

- API 地址默认是 `http://你的VPS-IP:4210`
- API Token 填 `.env` 里的 `API_AUTH_TOKEN`

登录一次后，token 会保存在当前浏览器本地。以后刷新面板不需要重新输入。更换 `API_AUTH_TOKEN` 后，在面板右上角退出，再输入新 token。

## 6. 基础检查

在 VPS 上检查 API：

```bash
source .env
curl http://127.0.0.1:4210/health
curl -H "Authorization: Bearer $API_AUTH_TOKEN" http://127.0.0.1:4210/snapshot
curl -H "Authorization: Bearer $API_AUTH_TOKEN" http://127.0.0.1:4210/journal
```

协议核验：

```bash
npm install
npm run verify:protocol
```

如果暂时没有私有 RPC，也可以先这样跑一次核验：

```bash
BSC_HTTP_RPC=https://bsc-dataseed.binance.org npm run verify:protocol
```

实盘前必须看到：

```text
liveReady=true
```

## 7. 手动 J/U 小额实盘测试

先改 `.env`：

```bash
LIVE_TRADING=true
KILL_SWITCH=false
MAX_TRADE_USDT=3
DAILY_MAX_USDT=10
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_42BOT_LIVE_RISK
```

重启容器：

```bash
docker compose up -d --build
```

先运行不带 `--execute` 的计划模式：

```bash
npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --reason "first J/U test"
```

确认输出满足：

- `preconditionsReady=true`
- `broadcastReady=true`
- `blockedReasons` 为空，或只包含非阻断协议备注
- 必要交易显示 `call=passed` 和 `gas=passed`

确认无误后再执行：

```bash
npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --reason "first J/U test" --execute
```

测试结束后立刻恢复：

```bash
sed -i 's/^KILL_SWITCH=false/KILL_SWITCH=true/' .env
docker compose up -d --build
```

## 8. 更新代码

```bash
cd /opt/42bot
git pull
docker compose up -d --build
docker compose ps
```

如果依赖变了：

```bash
npm install
npm run verify
```

## 9. 常用排错

查看状态：

```bash
docker compose ps
```

看日志：

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

查看交易账本：

```bash
cat data/journal.json
```

## 10. 保留的底线

- `.env` 不进 Git。
- 私钥只放 VPS 的 `.env`，不放仓库、不发聊天。
- 实盘只用专用小额热钱包。
- 没测试完就保持 `KILL_SWITCH=true`。
- 面板只负责观察和 dry-run，不放真实交易按钮。
