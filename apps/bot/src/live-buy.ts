import {
  JsonJournalStore,
  JsonRuntimeLogStore,
  JsonRuntimeSettingsStore,
  applyRuntimeSettings,
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

const baseConfig = loadConfig();
const settingsStore = new JsonRuntimeSettingsStore(baseConfig.SETTINGS_FILE);
const runtimeLogStore = new JsonRuntimeLogStore(baseConfig.RUNTIME_LOG_FILE);
const settings = await settingsStore.read();
const config = applyRuntimeSettings(baseConfig, settings.settings);
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
  reason: args.reason ?? "命令行手动小额买入"
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
await runtimeLogStore.append({
  level: "info",
  service: "live-buy",
  event: "starting",
  message: args.execute ? "开始执行命令行小额买入" : "开始生成命令行买入计划",
  details: {
    execute: Boolean(args.execute),
    marketAddress: intent.marketAddress,
    tokenId: intent.tokenId,
    amountUsdt: intent.amountUsdt,
    slippageBps: intent.slippageBps
  }
});

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
  await runtimeLogStore.append({
    level: plan.broadcastReady ? "info" : "warn",
    service: "live-buy",
    event: "plan_only_journaled",
    message: plan.broadcastReady ? "买入计划已生成，尚未执行真实交易" : "买入计划被风控或预演阻断",
    details: {
      journalEntries: summary.totals.entries,
      broadcastReady: plan.broadcastReady,
      blockedReasons: plan.blockedReasons.slice(0, 8)
    }
  });
  console.log(
    JSON.stringify({
      level: "info",
      service: "live-buy",
      event: "plan_only_journaled",
      journalEntries: summary.totals.entries,
      message: "确认 blockedReasons 和交易预演后，才可以追加 --execute 执行真实交易。"
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
await runtimeLogStore.append({
  level: result.status === "blocked" || result.status === "failed" ? "error" : "info",
  service: "live-buy",
  event: "execution_finished",
  message: translateExecutionStatus(result.status),
  details: {
    status: result.status,
    executed: result.executed.map((tx) => tx.hash),
    skipped: result.skipped.length,
    blockedReasons: result.blockedReasons.slice(0, 8),
    error: result.error,
    journalEntries: summary.totals.entries,
    realizedPnlUsdt: summary.totals.realizedPnlUsdt
  }
});

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
      throw new Error(`未知参数：${key}`);
    }
  }
  return parsed;
}

function requireValue(key: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    throw new Error(`${key} 需要填写值`);
  }
  return value;
}

function parsePositiveNumber(key: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${key} 必须是大于 0 的数字`);
  }
  return parsed;
}

function parseNonNegativeInteger(key: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} 必须是非负整数`);
  }
  return parsed;
}

function printUsageAndExit(): never {
  console.error(
    [
      "用法：",
      "npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500",
      "npm run live:buy -- --market 0xMarket --tokenId 1 --amountUsdt 3 --slippageBps 500 --execute",
      "",
      "不加 --execute 时，只生成计划并写入交易账本，不会发真实交易。"
    ].join("\n")
  );
  process.exit(1);
}

function translateExecutionStatus(status: string): string {
  const map: Record<string, string> = {
    blocked: "真实交易被阻断",
    submitted: "真实交易已提交",
    confirmed: "真实交易已确认",
    failed: "真实交易失败"
  };
  return map[status] ?? status;
}
