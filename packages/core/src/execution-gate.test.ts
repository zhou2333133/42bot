import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";
import { evaluateExecutionReadiness } from "./execution-gate.js";
import type { ProtocolGate } from "./types.js";

const readyProtocol: ProtocolGate = {
  liveReady: true,
  pass: 1,
  warn: 0,
  fail: 0,
  reasons: []
};

describe("evaluateExecutionReadiness", () => {
  it("blocks execution by default", () => {
    const readiness = evaluateExecutionReadiness(loadConfig({}), readyProtocol);
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons).toContain("LIVE_TRADING 未开启");
  });

  it("blocks execution when protocol report is not live-ready", () => {
    const readiness = evaluateExecutionReadiness(
      loadConfig({
        LIVE_TRADING: "true",
        BSC_HTTP_RPC: "https://example.invalid",
        WALLET_ADDRESS: "0x0000000000000000000000000000000000000001",
        PRIVATE_KEY: "redacted"
      }),
      { liveReady: false, pass: 1, warn: 1, fail: 0, reasons: ["rpc missing"] }
    );

    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.join(" ")).toContain("协议核验未 liveReady");
  });
});
