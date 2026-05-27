import cors from "cors";
import express from "express";
import {
  JsonStateStore,
  buildSnapshot,
  loadConfig,
  redactConfig
} from "@42bot/core";
import type { BotSnapshot, MarketScore } from "@42bot/core";

const config = loadConfig();
const store = new JsonStateStore(config.STATE_FILE);
const app = express();

app.use(cors());
app.use(express.json({ limit: "256kb" }));

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
    response.json(snapshot);
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

app.post("/control/pause", (_request, response) => {
  response.status(409).json({
    ok: false,
    error: "control_not_enabled",
    message: "Phase 1 is read-only. Trading controls are enabled only after execution and kill-switch storage are implemented."
  });
});

app.post("/control/resume", (_request, response) => {
  response.status(409).json({
    ok: false,
    error: "control_not_enabled",
    message: "Phase 1 is read-only. Trading controls are enabled only after execution and kill-switch storage are implemented."
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "unknown error";
  response.status(500).json({
    ok: false,
    error: "internal_error",
    message
  });
});

app.listen(config.API_PORT, config.API_HOST, () => {
  console.log(JSON.stringify({ level: "info", service: "api", event: "listening", host: config.API_HOST, port: config.API_PORT }));
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
    refreshInFlight = buildSnapshot(config)
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

function compareScores(left: MarketScore, right: MarketScore): number {
  if (right.score !== left.score) return right.score - left.score;
  return left.marketAddress.localeCompare(right.marketAddress);
}
