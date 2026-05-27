import {
  JsonRuntimeLogStore,
  JsonRuntimeSettingsStore,
  JsonStateStore,
  applyRuntimeSettings,
  buildSnapshot,
  loadConfig,
  redactConfig
} from "@42bot/core";

const config = loadConfig();
const store = new JsonStateStore(config.STATE_FILE);
const settingsStore = new JsonRuntimeSettingsStore(config.SETTINGS_FILE);
const runtimeLogStore = new JsonRuntimeLogStore(config.RUNTIME_LOG_FILE);

let stopped = false;

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log(JSON.stringify({ level: "info", service: "bot", event: "starting", config: redactConfig(config) }));
await runtimeLogStore.append({
  level: "info",
  service: "bot",
  event: "starting",
  message: "机器人进程已启动",
  details: { config: redactConfig(config) }
});

while (!stopped) {
  const startedAt = Date.now();
  try {
    const settings = await settingsStore.read();
    const effectiveConfig = applyRuntimeSettings(config, settings.settings);
    await runtimeLogStore.append({
      level: "info",
      service: "bot",
      event: "poll_started",
      message: "开始拉取 42space 市场并计算策略评分",
      details: {
        lookback: effectiveConfig.MARKET_LOOKBACK_LIMIT,
        minScore: effectiveConfig.HOT_MARKET_MIN_SCORE,
        requireRealMints: effectiveConfig.REQUIRE_REAL_MINTS
      }
    });
    const snapshot = await buildSnapshot(effectiveConfig);
    await store.write(snapshot);
    const candidates = snapshot.scores.filter((score) => score.action === "candidate").length;
    console.log(
      JSON.stringify({
        level: "info",
        service: "bot",
        event: "snapshot_written",
        markets: snapshot.markets.length,
        scores: snapshot.scores.length,
        candidates,
        durationMs: snapshot.status.durationMs
      })
    );
    await runtimeLogStore.append({
      level: candidates > 0 ? "warn" : "info",
      service: "bot",
      event: "snapshot_written",
      message: candidates > 0 ? `发现 ${candidates} 个候选市场` : "本轮没有达到候选阈值的市场",
      details: {
        markets: snapshot.markets.length,
        scores: snapshot.scores.length,
        candidates,
        durationMs: snapshot.status.durationMs
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    console.error(
      JSON.stringify({
        level: "error",
        service: "bot",
        event: "poll_failed",
        message
      })
    );
    await runtimeLogStore.append({
      level: "error",
      service: "bot",
      event: "poll_failed",
      message: `轮询失败：${message}`
    });
  }

  const elapsedMs = Date.now() - startedAt;
  const latestSettings = await settingsStore.read();
  const latestConfig = applyRuntimeSettings(config, latestSettings.settings);
  await sleep(Math.max(1_000, latestConfig.POLL_INTERVAL_MS - elapsedMs));
}

console.log(JSON.stringify({ level: "info", service: "bot", event: "stopped" }));
await runtimeLogStore.append({
  level: "info",
  service: "bot",
  event: "stopped",
  message: "机器人进程已停止"
});

function stop(): void {
  stopped = true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
