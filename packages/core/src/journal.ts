import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ExecutionPlan, ExecutionResult, JournalSummary, PositionSummary, TradeJournalEntry } from "./types.js";

export class JsonJournalStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<JournalSummary> {
    try {
      const text = await readFile(this.filePath, "utf8");
      const entries = JSON.parse(text) as TradeJournalEntry[];
      return summarizeJournal(entries);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return summarizeJournal([]);
      }
      throw error;
    }
  }

  async append(entry: TradeJournalEntry): Promise<JournalSummary> {
    const current = await this.read();
    const entries = [...current.entries, entry].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
    return summarizeJournal(entries);
  }
}

export function createJournalEntryFromPlan(plan: ExecutionPlan): TradeJournalEntry {
  const now = new Date().toISOString();
  return {
    id: createEntryId(now, plan.intent.marketAddress, plan.intent.tokenId, plan.side),
    createdAt: now,
    updatedAt: now,
    side: plan.side,
    status: plan.broadcastReady ? "planned" : "blocked",
    marketAddress: plan.intent.marketAddress,
    tokenId: plan.intent.tokenId,
    amountUsdt: plan.intent.amountUsdt,
    slippageBps: plan.intent.slippageBps,
    reason: plan.intent.reason,
    quote: plan.quote ? quoteToJournal(plan.quote) : undefined,
    transactionHashes: [],
    blockedReasons: plan.blockedReasons
  };
}

export function createJournalEntryFromExecution(plan: ExecutionPlan, result: ExecutionResult): TradeJournalEntry {
  const now = new Date().toISOString();
  return {
    id: createEntryId(now, plan.intent.marketAddress, plan.intent.tokenId, plan.side),
    createdAt: result.createdAt,
    updatedAt: now,
    side: plan.side,
    status: result.status,
    marketAddress: plan.intent.marketAddress,
    tokenId: plan.intent.tokenId,
    amountUsdt: plan.intent.amountUsdt,
    slippageBps: plan.intent.slippageBps,
    reason: plan.intent.reason,
    quote: plan.quote ? quoteToJournal(plan.quote) : undefined,
    transactionHashes: result.executed.map((tx) => tx.hash),
    blockedReasons: result.blockedReasons,
    error: result.error
  };
}

export function summarizeJournal(entries: TradeJournalEntry[]): JournalSummary {
  const positions = new Map<string, PositionSummary>();
  const totals = {
    entries: entries.length,
    submitted: 0,
    confirmed: 0,
    failed: 0,
    blocked: 0,
    buyUsdt: 0,
    sellUsdt: 0,
    realizedPnlUsdt: 0
  };

  for (const entry of entries) {
    if (entry.status === "submitted") totals.submitted += 1;
    if (entry.status === "confirmed") totals.confirmed += 1;
    if (entry.status === "failed") totals.failed += 1;
    if (entry.status === "blocked") totals.blocked += 1;
    if (entry.status !== "submitted" && entry.status !== "confirmed") continue;

    const key = `${entry.marketAddress.toLowerCase()}:${entry.tokenId}`;
    const position =
      positions.get(key) ??
      {
        key,
        marketAddress: entry.marketAddress,
        tokenId: entry.tokenId,
        buyUsdt: 0,
        sellUsdt: 0,
        realizedPnlUsdt: 0,
        buyCount: 0,
        sellCount: 0,
        lastUpdatedAt: entry.updatedAt,
        open: false
      };

    if (entry.side === "buy") {
      position.buyUsdt += entry.amountUsdt;
      position.buyCount += 1;
      totals.buyUsdt += entry.amountUsdt;
    } else {
      position.sellUsdt += entry.amountUsdt;
      position.sellCount += 1;
      totals.sellUsdt += entry.amountUsdt;
    }

    position.realizedPnlUsdt = roundUsdt(position.sellUsdt - position.buyUsdt);
    position.lastUpdatedAt = entry.updatedAt;
    position.open = position.buyUsdt > position.sellUsdt;
    positions.set(key, position);
  }

  totals.buyUsdt = roundUsdt(totals.buyUsdt);
  totals.sellUsdt = roundUsdt(totals.sellUsdt);
  totals.realizedPnlUsdt = roundUsdt(totals.sellUsdt - totals.buyUsdt);

  return {
    updatedAt: new Date().toISOString(),
    entries,
    positions: [...positions.values()].sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt)),
    totals
  };
}

function quoteToJournal(quote: ExecutionPlan["quote"]): TradeJournalEntry["quote"] {
  if (!quote) return undefined;
  if (quote.side === "buy") {
    return {
      amountIn: quote.amountIn.toString(),
      otToUser: quote.otToUser.toString(),
      minOut: quote.minOtOut.toString()
    };
  }

  return {
    amountIn: quote.amountIn.toString(),
    collateralToUser: quote.collateralToUser.toString(),
    minOut: quote.minCollateralOut.toString()
  };
}

function createEntryId(createdAt: string, marketAddress: string, tokenId: string, side: string): string {
  return `${createdAt.replace(/[^0-9]/g, "")}-${side}-${marketAddress.slice(2, 8).toLowerCase()}-${tokenId}`;
}

function roundUsdt(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
