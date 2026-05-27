# VPS Deployment Runbook

This runbook is for a small private VPS deployment. Do not expose a live-trading control surface without authentication and firewall rules.

## 1. Clone And Install

```bash
git clone https://github.com/zhou2333133/42bot.git
cd 42bot
cp .env.example .env
npm install
npm run verify
```

## 2. Configure `.env`

Minimum observation-mode settings:

```bash
API_AUTH_TOKEN=<generate-a-long-random-token>
CORS_ORIGIN=http://your-vps-ip:4220
LIVE_TRADING=false
KILL_SWITCH=true
```

Before any live test, also configure:

```bash
BSC_HTTP_RPC=<private-or-paid-bsc-rpc>
BSC_WS_RPC=<private-or-paid-bsc-websocket>
WALLET_ADDRESS=<dedicated-hot-wallet-address>
PRIVATE_KEY=<dedicated-hot-wallet-private-key>
MAX_TRADE_USDT=3
DAILY_MAX_USDT=10
MAX_OPEN_POSITIONS=1
MAX_SLIPPAGE_BPS=500
MAX_GAS_GWEI=5
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_42BOT_LIVE_RISK
```

Keep `KILL_SWITCH=true` until the exact live test moment. Never paste secrets into chat, docs, screenshots, or commits.

## 3. Protocol Verification

```bash
npm run verify:protocol
```

`data/protocol-verification-latest.json` must show `liveReady=true` before broadcasting is allowed. A warning about unresolved protocol evidence should be treated as a blocker for real funds.

## 4. Docker Compose

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api bot dashboard
```

Health checks:

- API: `http://127.0.0.1:4210/health`
- Dashboard: `http://127.0.0.1:4220/`

Protected API requests require:

```bash
Authorization: Bearer <API_AUTH_TOKEN>
```

## 5. Firewall And Exposure

Recommended:

- Keep `4210` accessible only from localhost or your trusted IP.
- Expose `4220` only behind a reverse proxy with HTTPS and basic auth.
- Do not expose any future trade endpoint publicly.
- Use a dedicated hot wallet with only the J/U test amount.

## 6. Live Test Checklist

Before the first small trade:

- `npm run verify` passes.
- `npm run verify:protocol` returns `liveReady=true`.
- Dashboard execution dry-run shows `preconditionsReady=true`.
- Broadcast shows `ready`, but no API trade endpoint is exposed.
- Wallet balance is only the test amount.
- `MAX_TRADE_USDT` and `DAILY_MAX_USDT` are tiny.
- `KILL_SWITCH=false` only for the test window.
- After the test, set `KILL_SWITCH=true` again.
