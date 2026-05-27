# Ubuntu VPS 完整部署手册

本手册面向一台全新的 Ubuntu VPS，用于部署 42bot 的观察模式、协议核验、机器人 API、后台 bot 和网页观察面板。这里的“面板”指 42bot 自己的 Dashboard，不是宝塔、1Panel 或 VPS 系统管理面板。

默认部署策略是：API 和 Dashboard 只监听 VPS 本机 `127.0.0.1`，你通过 SSH 隧道从自己电脑访问。这样最安全，避免把交易机器人控制面裸露到公网。

以下命令假设系统是 Ubuntu 22.04 或 24.04，用户是 `root`。如果你用普通用户，请在命令前加 `sudo`。

## 1. 更新系统

```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg git openssh-client ufw nano
```

设置时区：

```bash
timedatectl set-timezone Asia/Hong_Kong
timedatectl
```

## 2. 安装 Docker

按 Docker 官方 Ubuntu APT 源安装 Docker Engine 和 Compose 插件：

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
docker run --rm hello-world
```

如果你不是 root 用户，加入 docker 组：

```bash
usermod -aG docker $USER
newgrp docker
```

## 3. 配置防火墙

先允许 SSH，避免把自己锁在外面：

```bash
ufw allow OpenSSH
ufw enable
ufw status
```

默认不开放 `4210` 和 `4220` 到公网。当前 `docker-compose.yml` 已把 API 和 Dashboard 绑定到 `127.0.0.1`，外网不能直接访问。

## 4. 获取 GitHub 私有仓库代码

仓库地址：

```bash
https://github.com/zhou2333133/42bot.git
```

如果仓库是私有仓库，推荐使用 SSH deploy key。

在 VPS 上生成只给这个仓库使用的 SSH key：

```bash
ssh-keygen -t ed25519 -C "42bot-vps" -f ~/.ssh/42bot_deploy_key
cat ~/.ssh/42bot_deploy_key.pub
```

把输出的公钥添加到 GitHub 仓库：

```text
GitHub 仓库 -> Settings -> Deploy keys -> Add deploy key
```

只勾读权限即可，不要勾 `Allow write access`。

然后写 SSH 配置：

```bash
cat > ~/.ssh/config <<'EOF'
Host github.com-42bot
  HostName github.com
  User git
  IdentityFile ~/.ssh/42bot_deploy_key
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config ~/.ssh/42bot_deploy_key
ssh -T git@github.com-42bot
```

拉取仓库：

```bash
mkdir -p /opt
cd /opt
git clone git@github.com-42bot:zhou2333133/42bot.git
cd /opt/42bot
```

如果你暂时不用 deploy key，也可以用 GitHub HTTPS + PAT 拉取，但不要把 token 写进文档、截图或 shell history。

## 5. 创建 `.env`

```bash
cd /opt/42bot
cp .env.example .env
chmod 600 .env
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
API_AUTH_TOKEN=<生成一个足够长的随机 token>
CORS_ORIGIN=http://127.0.0.1:4220
VITE_API_BASE=http://127.0.0.1:4210
VITE_API_AUTH_TOKEN=<通常与 API_AUTH_TOKEN 相同>

STATE_FILE=./data/state.json
JOURNAL_FILE=./data/journal.json
PROTOCOL_REPORT_JSON_PATH=./data/protocol-verification-latest.json
```

生成随机 token：

```bash
openssl rand -hex 32
```

任何实盘测试前，还需要配置这些值：

```bash
BSC_HTTP_RPC=<私有或付费 BSC HTTP RPC>
BSC_WS_RPC=<私有或付费 BSC WebSocket RPC>
WALLET_ADDRESS=<专用小额热钱包地址>
PRIVATE_KEY=<专用小额热钱包私钥>

MAX_TRADE_USDT=3
DAILY_MAX_USDT=10
MAX_OPEN_POSITIONS=1
MAX_SLIPPAGE_BPS=500
MAX_GAS_GWEI=5
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_42BOT_LIVE_RISK
```

在真正发起小额测试交易之前，保持：

```bash
LIVE_TRADING=false
KILL_SWITCH=true
```

不要把私钥、RPC token、API token 粘贴到聊天、文档、截图或提交记录里。

## 6. 本地验证

如果 VPS 内存较小，`npm install` 可能比较慢。先在宿主机上做一次基础验证：

```bash
npm install
npm run verify
```

协议核验需要 HTTP RPC 才能检查近期交易回执：

```bash
BSC_HTTP_RPC=https://bsc-dataseed.binance.org npm run verify:protocol
```

正式实盘前建议改用你自己的私有 RPC，再运行：

```bash
npm run verify:protocol
```

`docs/protocol-verification-latest.md` 和 `data/protocol-verification-latest.json` 都应显示 `liveReady=true`。如果有阻断性协议证据未解决，不能实盘。

## 7. 启动 Docker Compose

每次修改 `.env` 中的 `VITE_API_BASE` 或 `VITE_API_AUTH_TOKEN` 后，都要重新 build，因为它们会打进前端 Dashboard。

```bash
docker compose up -d --build
docker compose ps
```

查看日志：

```bash
docker compose logs -f api
docker compose logs -f bot
docker compose logs -f dashboard
```

健康检查：

```bash
curl http://127.0.0.1:4210/health
curl http://127.0.0.1:4220/
```

带鉴权访问 API：

```bash
source .env
curl -H "Authorization: Bearer $API_AUTH_TOKEN" http://127.0.0.1:4210/snapshot
curl -H "Authorization: Bearer $API_AUTH_TOKEN" http://127.0.0.1:4210/journal
```

## 8. 从自己电脑打开 Dashboard

推荐使用 SSH 隧道，不开放公网端口。

在你自己的电脑上运行：

```bash
ssh -L 4220:127.0.0.1:4220 -L 4210:127.0.0.1:4210 root@你的VPS-IP
```

然后在你电脑浏览器打开：

```text
http://127.0.0.1:4220
```

如果 API token 配置正确，Dashboard 会显示机器人状态、市场、策略评分、执行 dry-run 和交易账本。

## 9. 可选：Nginx + 基础认证

如果你确实要通过公网域名访问 Dashboard，必须至少加 HTTPS、基础认证、防火墙限制和强 API token。更推荐只使用 SSH 隧道。

安装 Nginx 和密码工具：

```bash
apt install -y nginx apache2-utils
htpasswd -c /etc/nginx/.htpasswd 42bot
```

示例 Nginx 配置：

```nginx
server {
    listen 80;
    server_name 你的域名;

    auth_basic "42bot";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:4220;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4210/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用配置后：

```bash
nginx -t
systemctl reload nginx
```

公网模式下不要把 `VITE_API_AUTH_TOKEN` 当成真正秘密，因为它会进入浏览器前端代码。公网访问只适合作为只读观察入口，实盘交易仍应走 SSH 到 VPS 后的命令行。

## 10. 手动 J/U 小额实盘测试

先确认 `.env`：

```bash
LIVE_TRADING=true
KILL_SWITCH=false
MAX_TRADE_USDT=3
DAILY_MAX_USDT=10
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_42BOT_LIVE_RISK
```

先运行不带 `--execute` 的计划模式：

```bash
npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --reason "first J/U test"
```

检查输出：

- `preconditionsReady` 必须为 `true`
- `broadcastReady` 必须为 `true`
- `blockedReasons` 必须为空，或只包含非阻断协议备注
- 必要交易必须显示 `call=passed` 和 `gas=passed`

确认无误后，再运行显式执行命令：

```bash
npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --reason "first J/U test" --execute
```

测试结束后立刻恢复熔断：

```bash
sed -i 's/^KILL_SWITCH=false/KILL_SWITCH=true/' .env
docker compose up -d --build
```

## 11. 更新代码

```bash
cd /opt/42bot
git pull
npm install
npm run verify
docker compose up -d --build
docker compose ps
```

如果更新改了协议核验器或合约配置：

```bash
npm run verify:protocol
```

## 12. 常用排错

查看服务状态：

```bash
docker compose ps
```

查看实时日志：

```bash
docker compose logs -f api bot dashboard
```

重启服务：

```bash
docker compose restart
```

完全重建：

```bash
docker compose down
docker compose up -d --build
```

确认端口只监听本机：

```bash
ss -lntp | grep -E '4210|4220'
```

正常应看到 `127.0.0.1:4210` 和 `127.0.0.1:4220`。

检查数据文件：

```bash
ls -lah data
cat data/journal.json
```

## 13. 安全底线

- 不要在 VPS 上放超过测试所需的资金。
- 不要把 `.env`、`data/`、日志截图发到公开渠道。
- 不要开放 `4210` 和 `4220` 到全网。
- 不要在公网 Dashboard 上放可触发实盘交易的按钮。
- 私钥只放专用小额热钱包，不放主钱包。
- 每次实盘测试后恢复 `KILL_SWITCH=true`。
