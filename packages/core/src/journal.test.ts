import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { JsonJournalStore, createJournalEntryFromExecution, createJournalEntryFromPlan, summarizeJournal } from "./journal.js";
import type { ExecutionPlan, ExecutionResult, TradeJournalEntry } from "./types.js";

describe("journal", () => {
  it("summarizes positions and realized PnL from confirmed entries", () => {
    const entries: TradeJournalEntry[] = [
      entry({ side: "buy", status: "confirmed", amountUsdt: 3 }),
      entry({ side: "buy", status: "submitted", amountUsdt: 2 }),
      entry({ side: "sell", status: "confirmed", amountUsdt: 7 }),
      entry({ side: "buy", status: "blocked", amountUsdt: 99 })
    ];

    const summary = summarizeJournal(entries);

    expect(summary.totals.entries).toBe(4);
    expect(summary.totals.buyUsdt).toBe(5);
    expect(summary.totals.sellUsdt).toBe(7);
    expect(summary.totals.realizedPnlUsdt).toBe(2);
    expect(summary.totals.blocked).toBe(1);
    expect(summary.positions[0]).toMatchObject({
      buyUsdt: 5,
      sellUsdt: 7,
      realizedPnlUsdt: 2,
      open: false
    });
  });

  it("creates blocked journal entries from non-ready plans", () => {
    const plan = fakePlan({ broadcastReady: false });
    const journalEntry = createJournalEntryFromPlan(plan);

    expect(journalEntry.status).toBe("blocked");
    expect(journalEntry.blockedReasons).toContain("not ready");
  });

  it("creates submitted journal entries from execution results", () => {
    const plan = fakePlan({ broadcastReady: true });
    const result: ExecutionResult = {
      createdAt: "2026-05-27T00:00:01.000Z",
      status: "submitted",
      side: "buy",
      intent: plan.intent,
      executed: [
        {
          kind: "swap",
          to: plan.intent.marketAddress,
          description: "swap",
          hash: "0x000000000000000000000000000000000000000000000000000000000000000a"
        }
      ],
      skipped: [],
      blockedReasons: []
    };

    const journalEntry = createJournalEntryFromExecution(plan, result);

    expect(journalEntry.status).toBe("submitted");
    expect(journalEntry.transactionHashes).toEqual(["0x000000000000000000000000000000000000000000000000000000000000000a"]);
  });

  it("persists entries as JSON", async () => {
    const directory = await mkdtemp(join(tmpdir(), "42bot-journal-"));
    const path = join(directory, "journal.json");
    const store = new JsonJournalStore(path);

    await store.append(entry({ side: "buy", status: "confirmed", amountUsdt: 3 }));
    const summary = await store.append(entry({ side: "sell", status: "confirmed", amountUsdt: 4 }));
    const raw = JSON.parse(await readFile(path, "utf8")) as TradeJournalEntry[];

    expect(raw).toHaveLength(2);
    expect(summary.totals.realizedPnlUsdt).toBe(1);
  });
});

function entry(params: { side: "buy" | "sell"; status: TradeJournalEntry["status"]; amountUsdt: number }): TradeJournalEntry {
  return {
    id: `${params.side}-${params.status}-${params.amountUsdt}`,
    createdAt: "2026-05-27T00:00:00.000Z",
    updatedAt: "2026-05-27T00:00:00.000Z",
    side: params.side,
    status: params.status,
    marketAddress: "0x0000000000000000000000000000000000000002",
    tokenId: "1",
    amountUsdt: params.amountUsdt,
    slippageBps: 500,
    reason: "test",
    transactionHashes: [],
    blockedReasons: []
  };
}

function fakePlan(params: { broadcastReady: boolean }): ExecutionPlan {
  return {
    createdAt: "2026-05-27T00:00:00.000Z",
    side: "buy",
    intent: {
      marketAddress: "0x0000000000000000000000000000000000000002",
      tokenId: "1",
      amountUsdt: 3,
      slippageBps: 500,
      reason: "test"
    },
    protocolGate: {
      liveReady: params.broadcastReady,
      pass: 1,
      warn: 0,
      fail: 0,
      reasons: []
    },
    risk: {
      allowed: params.broadcastReady,
      reasons: [],
      mode: params.broadcastReady ? "live" : "blocked"
    },
    readiness: {
      ready: params.broadcastReady,
      reasons: []
    },
    gas: {
      status: params.broadcastReady ? "passed" : "skipped",
      maxGasGwei: 5,
      withinCap: params.broadcastReady,
      reasons: []
    },
    quoteCheck: {
      status: params.broadcastReady ? "passed" : "skipped"
    },
    balanceChecks: [],
    transactions: [],
    preconditionsReady: params.broadcastReady,
    broadcastImplemented: true,
    broadcastReady: params.broadcastReady,
    broadcastReadiness: {
      ready: params.broadcastReady,
      configured: params.broadcastReady,
      requiredConfirmation: "test",
      reasons: params.broadcastReady ? [] : ["not ready"]
    },
    blockedReasons: params.broadcastReady ? [] : ["not ready"]
  };
}
