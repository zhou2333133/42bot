import cors from "cors";
import express from "express";
import {
  JsonJournalStore,
  JsonRuntimeLogStore,
  JsonRuntimeSettingsStore,
  JsonStateStore,
  applyRuntimeSettings,
  buildRuntimeSettingsView,
  buildExecutionPlan,
  buildSnapshot,
  loadConfig,
  redactConfig
} from "@42bot/core";
import type { BotSnapshot, ExecutionPlan, MarketScore, TradeIntent, TradeSide } from "@42bot/core";
import { applySecurityHeaders, requireApiAuth } from "./security.js";

const config = loadConfig();
const store = new JsonStateStore(config.STATE_FILE);
const journalStore = new JsonJournalStore(config.JOURNAL_FILE);
const settingsStore = new JsonRuntimeSettingsStore(config.SETTINGS_FILE);
const runtimeLogStore = new JsonRuntimeLogStore(config.RUNTIME_LOG_FILE);
const app = express();

app.use(applySecurityHeaders);
app.use(
  cors({
    origin: config.CORS_ORIGIN || true,
    credentials: Boolean(config.API_AUTH_TOKEN)
  })
);
app.use(express.json({ limit: "256kb" }));
app.use(requireApiAuth(config));

let cachedSnapshot: BotSnapshot | null = null;
let refreshInFlight: Promise<BotSnapshot> | null = null;

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "42bot-api",
    now: new Date().toISOString(),
    config: redactConfig(config)
  });
});

app.get("/snapshot", async (_request, response, next) => {
  try {
    const snapshot = await loadSnapshot();
    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.post("/refresh", async (_request, response, next) => {
  try {
    const snapshot = await refreshSnapshot();
    await appendApiLog("info", "manual_refresh", "面板触发了一次手动刷新", {
      markets: snapshot.markets.length,
      candidates: snapshot.scores.filter((score) => score.action === "candidate").length
    });
    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.get("/settings", async (_request, response, next) => {
  try {
    response.json(buildRuntimeSettingsView(config, await settingsStore.read()));
  } catch (error) {
    next(error);
  }
});

app.patch("/settings", async (request, response, next) => {
  try {
    const saved = await settingsStore.patch(request.body);
    const view = buildRuntimeSettingsView(config, saved);
    cachedSnapshot = null;
    await appendApiLog("info", "settings_updated", "面板更新了运行设置", {
      changed: Object.keys(request.body as Record<string, unknown>)
    });
    response.json(view);
  } catch (error) {
    next(error);
  }
});

app.get("/logs", async (request, response, next) => {
  try {
    const limit = Number(request.query.limit ?? 120);
    response.json(await runtimeLogStore.read(Number.isFinite(limit) ? limit : 120));
  } catch (error) {
    next(error);
  }
});

app.get("/markets", async (_request, response, next) => {
  try {
    const snapshot = await loadSnapshot();
    response.json(snapshot.markets);
  } catch (error) {
    next(error);
  }
});

app.get("/scores", async (_request, response, next) => {
  try {
    const snapshot = await loadSnapshot();
    const scores = [...snapshot.scores].sort(compareScores);
    response.json(scores);
  } catch (error) {
    next(error);
  }
});

app.get("/journal", async (_request, response, next) => {
  try {
    response.json(await journalStore.read());
  } catch (error) {
    next(error);
  }
});

app.get("/execution/plan", async (request, response, next) => {
  try {
    const intent = parseTradeIntent(request.query);
    const side = parseSide(request.query.side);
    const effectiveConfig = await loadEffectiveConfig();
    const plan = await buildExecutionPlan({
      config: effectiveConfig,
      intent,
      side,
      skipChainPreflight: request.query.preflight === "false"
    });
    await appendApiLog(plan.broadcastReady ? "info" : "warn", "execution_plan", "生成了一次执行计划", {
      marketAddress: intent.marketAddress,
      tokenId: intent.tokenId,
      amountUsdt: intent.amountUsdt,
      broadcastReady: plan.broadcastReady,
      blockedReasons: plan.blockedReasons.slice(0, 5)
    });
    response.json(toJson(plan));
  } catch (error) {
    next(error);
  }
});

app.post("/control/pause", (_request, response) => {
  response.status(409).json({
    ok: false,
    error: "control_not_enabled",
    message: "当前阶段不开放面板真实交易控制。真实买入请继续使用 VPS 命令行，并先确认执行计划。"
  });
});

app.post("/control/resume", (_request, response) => {
  response.status(409).json({
    ok: false,
    error: "control_not_enabled",
    message: "当前阶段不开放面板真实交易控制。真实买入请继续使用 VPS 命令行，并先确认执行计划。"
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "未知错误";
  response.status(500).json({
    ok: false,
    error: "internal_error",
    message
  });
});

app.listen(config.API_PORT, config.API_HOST, () => {
  console.log(
    JSON.stringify({
      level: "info",
      service: "api",
      event: "listening",
      host: config.API_HOST,
      port: config.API_PORT,
      authEnabled: Boolean(config.API_AUTH_TOKEN)
    })
  );
});

async function loadSnapshot(): Promise<BotSnapshot> {
  if (cachedSnapshot) return cachedSnapshot;

  const stored = await store.read();
  if (stored) {
    cachedSnapshot = stored;
    return stored;
  }

  return refreshSnapshot();
}

async function refreshSnapshot(): Promise<BotSnapshot> {
  if (!refreshInFlight) {
    refreshInFlight = loadEffectiveConfig()
      .then((effectiveConfig) => buildSnapshot(effectiveConfig))
      .then(async (snapshot) => {
        cachedSnapshot = snapshot;
        await store.write(snapshot);
        return snapshot;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

async function loadEffectiveConfig() {
  const settings = await settingsStore.read();
  return applyRuntimeSettings(config, settings.settings);
}

async function appendApiLog(
  level: "info" | "warn" | "error",
  event: string,
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  await runtimeLogStore.append({
    level,
    service: "api",
    event,
    message,
    details
  });
}

function compareScores(left: MarketScore, right: MarketScore): number {
  if (right.score !== left.score) return right.score - left.score;
  return left.marketAddress.localeCompare(right.marketAddress);
}

function parseTradeIntent(query: express.Request["query"]): TradeIntent {
  const marketAddress = query.marketAddress;
  const tokenId = query.tokenId;
  const amountUsdt = Number(query.amountUsdt ?? config.MAX_TRADE_USDT);
  const slippageBps = Number(query.slippageBps ?? Math.min(config.MAX_SLIPPAGE_BPS, 500));

  if (typeof marketAddress !== "string" || marketAddress.trim() === "") {
    throw new Error("marketAddress query parameter is required");
  }
  if (typeof tokenId !== "string" || tokenId.trim() === "") {
    throw new Error("tokenId query parameter is required");
  }
  if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
    throw new Error("amountUsdt 必须是大于 0 的数字");
  }
  if (!Number.isInteger(slippageBps) || slippageBps < 0) {
    throw new Error("slippageBps 必须是非负整数");
  }

  return {
    marketAddress,
    tokenId,
    amountUsdt,
    slippageBps,
    reason: typeof query.reason === "string" && query.reason.trim() ? query.reason : "手动执行前计划"
  };
}

function parseSide(value: unknown): TradeSide {
  return value === "sell" ? "sell" : "buy";
}

function toJson(plan: ExecutionPlan): unknown {
  return JSON.parse(
    JSON.stringify(plan, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
  );
}
