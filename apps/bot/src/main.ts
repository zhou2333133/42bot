import { JsonStateStore, buildSnapshot, loadConfig, redactConfig } from "@42bot/core";

const config = loadConfig();
const store = new JsonStateStore(config.STATE_FILE);

let stopped = false;

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log(JSON.stringify({ level: "info", service: "bot", event: "starting", config: redactConfig(config) }));

while (!stopped) {
  const startedAt = Date.now();
  try {
    const snapshot = await buildSnapshot(config);
    await store.write(snapshot);
    console.log(
      JSON.stringify({
        level: "info",
        service: "bot",
        event: "snapshot_written",
        markets: snapshot.markets.length,
        scores: snapshot.scores.length,
        candidates: snapshot.scores.filter((score) => score.action === "candidate").length,
        durationMs: snapshot.status.durationMs
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "bot",
        event: "poll_failed",
        message: error instanceof Error ? error.message : "unknown error"
      })
    );
  }

  const elapsedMs = Date.now() - startedAt;
  await sleep(Math.max(1_000, config.POLL_INTERVAL_MS - elapsedMs));
}

console.log(JSON.stringify({ level: "info", service: "bot", event: "stopped" }));

function stop(): void {
  stopped = true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
