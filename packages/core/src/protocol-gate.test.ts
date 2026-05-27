import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadProtocolGate } from "./protocol-gate.js";

describe("loadProtocolGate", () => {
  it("reports nonblocking warnings without turning them into blocking reasons", async () => {
    const path = await writeReport({
      liveReady: true,
      checks: [
        { severity: "pass", id: "router", summary: "ok", blocksLiveExecution: true },
        { severity: "warn", id: "powercurve", summary: "mismatch", blocksLiveExecution: false }
      ]
    });

    const gate = await loadProtocolGate(path);

    expect(gate.liveReady).toBe(true);
    expect(gate.warn).toBe(1);
    expect(gate.reasons).toEqual(["nonblocking: powercurve: mismatch"]);
  });

  it("keeps blocking warnings in reasons", async () => {
    const path = await writeReport({
      liveReady: false,
      checks: [
        { severity: "warn", id: "rpc.receipts", summary: "missing", blocksLiveExecution: true }
      ]
    });

    const gate = await loadProtocolGate(path);

    expect(gate.liveReady).toBe(false);
    expect(gate.reasons).toEqual(["rpc.receipts: missing"]);
  });
});

async function writeReport(report: unknown): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "42bot-gate-"));
  const path = join(directory, "protocol.json");
  await writeFile(path, JSON.stringify(report), "utf8");
  return path;
}
