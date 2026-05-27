import {
  JsonJournalStore,
  buildExecutionPlan,
  createJournalEntryFromExecution,
  createJournalEntryFromPlan,
  executePreparedPlan,
  loadConfig,
  redactConfig,
  type TradeIntent
} from "@42bot/core";

interface CliArgs {
  marketAddress?: string;
  tokenId?: string;
  amountUsdt?: number;
  slippageBps?: number;
  reason?: string;
  execute?: boolean;
  waitForReceipts?: boolean;
}

const config = loadConfig();
const args = parseArgs(process.argv.slice(2));
const journal = new JsonJournalStore(config.JOURNAL_FILE);

if (!args.marketAddress || !args.tokenId || !args.amountUsdt) {
  printUsageAndExit();
}

const intent: TradeIntent = {
  marketAddress: args.marketAddress,
  tokenId: args.tokenId,
  amountUsdt: args.amountUsdt,
  slippageBps: args.slippageBps ?? Math.min(config.MAX_SLIPPAGE_BPS, 500),
  reason: args.reason ?? "manual live-buy cli"
};

console.log(
  JSON.stringify({
    level: "info",
    service: "live-buy",
    event: "starting",
    config: redactConfig(config),
    intent
  })
);

const plan = await buildExecutionPlan({ config, intent, side: "buy" });
console.log(
  JSON.stringify({
    level: plan.broadcastReady ? "info" : "warn",
    service: "live-buy",
    event: "plan_built",
    preconditionsReady: plan.preconditionsReady,
    broadcastReady: plan.broadcastReady,
    transactions: plan.transactions.map((tx) => ({
      kind: tx.kind,
      required: tx.required,
      to: tx.to,
      call: tx.preflight.call.status,
      gas: tx.preflight.gas.status,
      gasUnits: tx.preflight.gasUnits
    })),
    blockedReasons: plan.blockedReasons
  })
);

if (!args.execute) {
  const summary = await journal.append(createJournalEntryFromPlan(plan));
  console.log(
    JSON.stringify({
      level: "info",
      service: "live-buy",
      event: "plan_only_journaled",
      journalEntries: summary.totals.entries,
      message: "Add --execute only after reviewing the blockedReasons/transactions above."
    })
  );
  process.exit(plan.broadcastReady ? 0 : 2);
}

const result = await executePreparedPlan({
  config,
  plan,
  waitForReceipts: args.waitForReceipts ?? true
});
const summary = await journal.append(createJournalEntryFromExecution(plan, result));

console.log(
  JSON.stringify({
    level: result.status === "blocked" || result.status === "failed" ? "error" : "info",
    service: "live-buy",
    event: "execution_finished",
    status: result.status,
    executed: result.executed,
    skipped: result.skipped,
    blockedReasons: result.blockedReasons,
    error: result.error,
    journalEntries: summary.totals.entries,
    realizedPnlUsdt: summary.totals.realizedPnlUsdt
  })
);

if (result.status === "blocked" || result.status === "failed") {
  process.exitCode = 2;
}

function parseArgs(values: string[]): CliArgs {
  const parsed: CliArgs = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    const next = values[index + 1];
    if (key === "--market" || key === "--marketAddress") {
      parsed.marketAddress = requireValue(key, next);
      index += 1;
    } else if (key === "--tokenId") {
      parsed.tokenId = requireValue(key, next);
      index += 1;
    } else if (key === "--amountUsdt") {
      parsed.amountUsdt = parsePositiveNumber(key, requireValue(key, next));
      index += 1;
    } else if (key === "--slippageBps") {
      parsed.slippageBps = parseNonNegativeInteger(key, requireValue(key, next));
      index += 1;
    } else if (key === "--reason") {
      parsed.reason = requireValue(key, next);
      index += 1;
    } else if (key === "--execute") {
      parsed.execute = true;
    } else if (key === "--no-wait") {
      parsed.waitForReceipts = false;
    } else {
      throw new Error(`Unknown argument: ${key}`);
    }
  }
  return parsed;
}

function requireValue(key: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    throw new Error(`${key} requires a value`);
  }
  return value;
}

function parsePositiveNumber(key: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive number`);
  }
  return parsed;
}

function parseNonNegativeInteger(key: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative integer`);
  }
  return parsed;
}

function printUsageAndExit(): never {
  console.error(
    [
      "Usage:",
      "npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500",
      "npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --execute",
      "",
      "Without --execute, the command only builds a plan and writes a journal entry."
    ].join("\n")
  );
  process.exit(1);
}
