import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http, isAddress, type Hex } from "viem";
import { bsc } from "viem/chains";
import { CONTRACT_CANDIDATES, FortyTwoClient, loadConfig } from "@42bot/core";

const DOC_DEPLOYMENTS = "https://docs.42.space/for-developers/deployments.md";
const GITHUB_DEPLOYMENT = "https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/deployments/56-core.json";
const SOURCE_URLS = {
  router: "https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/FTRouterV2.sol",
  lens: "https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/lens/FTLensV2.sol",
  controller: "https://raw.githubusercontent.com/fortytwo-protocol/ft-contracts-public/main/src/controllerv2/FTControllerV2.sol"
} as const;

const REQUIRED_SOURCE_TOKENS = {
  router: ["function swapMarketV2", "function claimAllSimple", "function controllerV2"],
  lens: ["function simulateMint", "function simulateRedeem", "function snapshotMarket", "function getUserState"],
  controller: ["function isMarket", "function deployMarket", "function resolveOutcome", "function finaliseOutcome"]
} as const;

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DEFAULT_REPORT_PATH = resolve(PROJECT_ROOT, "docs/protocol-verification-latest.md");
const DEFAULT_JSON_PATH = resolve(PROJECT_ROOT, "data/protocol-verification-latest.json");

type Severity = "pass" | "warn" | "fail";

interface Check {
  id: string;
  severity: Severity;
  summary: string;
  details?: string;
  blocksLiveExecution: boolean;
}

interface ProtocolReport {
  generatedAt: string;
  liveReady: boolean;
  checks: Check[];
  docs: {
    deploymentsUrl: string;
    addresses: Record<string, string[]>;
  };
  github: {
    deploymentUrl: string;
    deployment?: GithubDeployment;
  };
  source: Record<keyof typeof SOURCE_URLS, { url: string; requiredTokens: string[]; found: string[]; missing: string[] }>;
  recentTransactions: Array<{
    hash: string;
    market: string;
    type: string;
    to?: string;
    status?: "success" | "reverted";
    matchedKnownContract: boolean;
    matchedLogAddress?: boolean;
    note?: string;
  }>;
  nextRequiredActions: string[];
}

interface GithubDeployment {
  network: {
    chainId: number;
    treasury?: string;
  };
  FTMarketController?: string;
  FTRouter?: string;
  FTLens?: string;
  FTControllerProxy?: string;
  FTRouterProxy?: string;
  FTLensV2?: string;
  PowerCurveLegacy?: Array<{ addy: string }>;
  PowerCurve?: Array<{ addy: string }>;
  PowerLDACurve?: Array<{ addy: string }>;
  ClockCurve?: Array<{ addy: string }>;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const reportPath = process.env.PROTOCOL_REPORT_PATH ?? DEFAULT_REPORT_PATH;
  const jsonPath = process.env.PROTOCOL_REPORT_JSON_PATH ?? DEFAULT_JSON_PATH;
  const checks: Check[] = [];

  const [docsMarkdown, githubDeployment, sourceTexts] = await Promise.all([
    fetchText(DOC_DEPLOYMENTS),
    fetchJson<GithubDeployment>(GITHUB_DEPLOYMENT),
    Promise.all(Object.entries(SOURCE_URLS).map(async ([key, url]) => [key, await fetchText(url)] as const))
  ]);

  const docsAddresses = extractBscscanAddresses(docsMarkdown);
  checks.push(...checkDocsAddresses(docsAddresses));
  checks.push(...checkGithubDeployment(githubDeployment));
  checks.push(...compareDocsAndGithub(docsAddresses, githubDeployment));

  const source = buildSourceChecks(sourceTexts, checks);

  const recentTransactions = await checkRecentTransactions(config.FORTYTWO_REST_BASE, config.BSC_HTTP_RPC, checks);
  const liveReady = checks.every((check) => !check.blocksLiveExecution || check.severity === "pass") && recentTransactions.length > 0;

  const report: ProtocolReport = {
    generatedAt: new Date().toISOString(),
    liveReady,
    checks,
    docs: {
      deploymentsUrl: DOC_DEPLOYMENTS,
      addresses: docsAddresses
    },
    github: {
      deploymentUrl: GITHUB_DEPLOYMENT,
      deployment: githubDeployment
    },
    source,
    recentTransactions,
    nextRequiredActions: buildNextActions(checks, recentTransactions)
  };

  await writeJson(jsonPath, report);
  await writeText(reportPath, renderMarkdown(report));
  console.log(JSON.stringify({ liveReady, reportPath, jsonPath, checks: summarizeChecks(checks) }, null, 2));

  if (!liveReady && process.env.PROTOCOL_REQUIRE_LIVE_READY === "true") {
    process.exitCode = 2;
  }
}

function checkDocsAddresses(addresses: Record<string, string[]>): Check[] {
  const all = new Set(Object.values(addresses).flat().map((address) => address.toLowerCase()));
  const expected = [
    CONTRACT_CANDIDATES.routerProxy,
    CONTRACT_CANDIDATES.controllerV2Proxy,
    CONTRACT_CANDIDATES.lensV2,
    CONTRACT_CANDIDATES.deprecatedRouter,
    CONTRACT_CANDIDATES.deprecatedController,
    CONTRACT_CANDIDATES.powerCurve,
    CONTRACT_CANDIDATES.powerLdaCurve,
    CONTRACT_CANDIDATES.clockCurve
  ];

  return expected.map((address) => {
    const blocksLiveExecution = [
      CONTRACT_CANDIDATES.routerProxy,
      CONTRACT_CANDIDATES.controllerV2Proxy,
      CONTRACT_CANDIDATES.lensV2
    ].some((critical) => critical.toLowerCase() === address.toLowerCase());
    return {
      id: `docs.address.${address}`,
      severity: all.has(address.toLowerCase()) ? "pass" : blocksLiveExecution ? "fail" : "warn",
      summary: `官方文档包含部署地址 ${address}`,
      details: blocksLiveExecution ? "实盘执行关键路径地址" : "非关键引用/废弃/曲线地址",
      blocksLiveExecution
    };
  });
}

function checkGithubDeployment(deployment: GithubDeployment): Check[] {
  const checks: Check[] = [];
  checks.push({
    id: "github.chain",
    severity: deployment.network?.chainId === 56 ? "pass" : "fail",
    summary: `GitHub 部署文件 chainId=${deployment.network?.chainId ?? "缺失"}`,
    blocksLiveExecution: true
  });

  const required: Array<[string, string | undefined]> = [
    ["FTRouterProxy", deployment.FTRouterProxy],
    ["FTControllerProxy", deployment.FTControllerProxy],
    ["FTLensV2", deployment.FTLensV2]
  ];

  for (const [name, address] of required) {
    checks.push({
      id: `github.address.${name}`,
      severity: address && isAddress(address) ? "pass" : "fail",
      summary: `${name}=${address ?? "缺失"}`,
      blocksLiveExecution: true
    });
  }

  return checks;
}

function compareDocsAndGithub(addresses: Record<string, string[]>, deployment: GithubDeployment): Check[] {
  const docsSet = new Set(Object.values(addresses).flat().map((address) => address.toLowerCase()));
  const checks: Check[] = [];
  const pairs: Array<[string, string | undefined]> = [
    ["FTRouterProxy", deployment.FTRouterProxy],
    ["FTControllerProxy", deployment.FTControllerProxy],
    ["FTLensV2", deployment.FTLensV2],
    ["PowerLDACurve", deployment.PowerLDACurve?.[0]?.addy],
    ["ClockCurve", deployment.ClockCurve?.[0]?.addy]
  ];

  for (const [name, address] of pairs) {
    const blocksLiveExecution = name === "FTRouterProxy" || name === "FTControllerProxy" || name === "FTLensV2";
    checks.push({
      id: `compare.docsGithub.${name}`,
      severity: address && docsSet.has(address.toLowerCase()) ? "pass" : "warn",
      summary: `${name} 官方文档/GitHub 地址一致性`,
      details: address ? `${address}` : "GitHub 部署文件缺失该地址",
      blocksLiveExecution
    });
  }

  const githubPowerCurve = deployment.PowerCurve?.[0]?.addy;
  const githubLegacyPowerCurve = deployment.PowerCurveLegacy?.[0]?.addy;
  checks.push({
    id: "compare.docsGithub.PowerCurve",
    severity: githubPowerCurve && docsSet.has(githubPowerCurve.toLowerCase()) ? "pass" : "warn",
    summary: "PowerCurve 官方文档/GitHub 地址一致性",
    details: `GitHub PowerCurve=${githubPowerCurve ?? "缺失"}, GitHub 旧版=${githubLegacyPowerCurve ?? "缺失"}。当前 Router/Lens 买入预演不直接依赖该地址，因此不是实盘关键阻断项；在构建曲线专用逻辑前必须继续跟踪。`,
    blocksLiveExecution: false
  });

  return checks;
}

async function checkRecentTransactions(restBase: string, rpcUrl: string, checks: Check[]): Promise<ProtocolReport["recentTransactions"]> {
  const client = new FortyTwoClient({ baseUrl: restBase });
  const markets = await client.getMarkets({ limit: 12, order: "created_at", ascending: false, status: "all" });
  const activities = (
    await Promise.all(
      markets.data.map(async (market) => {
        try {
          const response = await client.getActivity({ market: market.address, limit: 30 });
          return response.data;
        } catch {
          return [];
        }
      })
    )
  ).flat();
  const withHash = activities.filter((item) => item.transactionHash && item.marketAddress).slice(0, 12);

  if (withHash.length === 0) {
    checks.push({
      id: "activity.transactions",
      severity: "warn",
      summary: "未找到带交易 hash 的近期 REST activity",
      blocksLiveExecution: true
    });
    return [];
  }

  checks.push({
    id: "activity.transactions",
    severity: "pass",
    summary: `找到 ${withHash.length} 条带交易 hash 的近期 REST activity`,
    blocksLiveExecution: true
  });

  if (!rpcUrl) {
    checks.push({
      id: "rpc.receipts",
      severity: "warn",
      summary: "缺少 BSC_HTTP_RPC，已跳过交易 receipt 检查",
      details: "请在 .env 中设置 BSC_HTTP_RPC，以核验近期 activity 交易的目标地址和状态。",
      blocksLiveExecution: true
    });
    return withHash.map((item) => ({
      hash: item.transactionHash!,
      market: item.marketAddress,
      type: item.type,
      matchedKnownContract: false,
      note: "未设置 BSC_HTTP_RPC，已跳过 receipt 检查"
    }));
  }

  const publicClient = createPublicClient({ chain: bsc, transport: http(rpcUrl) });
  const knownContracts = new Set(
    [
      CONTRACT_CANDIDATES.routerProxy,
      CONTRACT_CANDIDATES.controllerV2Proxy,
      CONTRACT_CANDIDATES.deprecatedRouter,
      CONTRACT_CANDIDATES.deprecatedController
    ].map((address) => address.toLowerCase())
  );

  const transactions = [];
  for (const item of withHash) {
    try {
      const [receipt, tx] = await Promise.all([
        publicClient.getTransactionReceipt({ hash: item.transactionHash as Hex }),
        publicClient.getTransaction({ hash: item.transactionHash as Hex })
      ]);
      const to = tx.to?.toLowerCase();
      const logAddresses = new Set(receipt.logs.map((log) => log.address.toLowerCase()));
      const matchedLogAddress =
        logAddresses.has(item.marketAddress.toLowerCase()) ||
        [...knownContracts].some((address) => logAddresses.has(address));
      transactions.push({
        hash: item.transactionHash!,
        market: item.marketAddress,
        type: item.type,
        to: tx.to ?? undefined,
        status: receipt.status,
        matchedKnownContract: Boolean(to && knownContracts.has(to)) || matchedLogAddress,
        matchedLogAddress
      });
    } catch (error) {
      transactions.push({
        hash: item.transactionHash!,
        market: item.marketAddress,
        type: item.type,
        matchedKnownContract: false,
        note: error instanceof Error ? error.message : "未知 receipt 错误"
      });
    }
  }

  const matched = transactions.filter((item) => item.matchedKnownContract).length;
  const matchedViaLogs = transactions.filter((item) => item.matchedLogAddress).length;
  checks.push({
    id: "rpc.receipts",
    severity: matched > 0 ? "pass" : "warn",
    summary: `交易回执检查命中 ${matched}/${transactions.length} 条已知 router/controller/market 路径`,
    details:
      matched === 0
        ? "交易可能直接调用 market 合约，或需要更深入的 trace/BscScan 检查。"
        : `${matchedViaLogs}/${transactions.length} 条通过交易回执日志地址命中，可覆盖 Binance Wallet/account-router 风格交易。`,
    blocksLiveExecution: true
  });

  return transactions;
}

function buildSourceChecks(sourceTexts: Array<readonly [string, string]>, checks: Check[]): ProtocolReport["source"] {
  const byKey = new Map(sourceTexts);
  return {
    router: checkSource("router", byKey.get("router") ?? "", checks),
    lens: checkSource("lens", byKey.get("lens") ?? "", checks),
    controller: checkSource("controller", byKey.get("controller") ?? "", checks)
  };
}

function checkSource(sourceKey: keyof typeof SOURCE_URLS, sourceText: string, checks: Check[]): ProtocolReport["source"][typeof sourceKey] {
  const requiredTokens = [...REQUIRED_SOURCE_TOKENS[sourceKey]];
  const found = requiredTokens.filter((token) => sourceText.includes(token));
  const missing = requiredTokens.filter((token) => !sourceText.includes(token));
  checks.push({
    id: `source.${sourceKey}`,
    severity: missing.length === 0 ? "pass" : "fail",
    summary: `${sourceKey} 源码关键标记检查 ${found.length}/${requiredTokens.length}`,
    details: missing.length > 0 ? `缺失：${missing.join(", ")}` : undefined,
    blocksLiveExecution: true
  });
  return {
    url: SOURCE_URLS[sourceKey],
    requiredTokens,
    found,
    missing
  };
}

function extractBscscanAddresses(markdown: string): Record<string, string[]> {
  const regex = /https:\/\/bscscan\.com\/(?:address|token)\/(0x[a-fA-F0-9]{40})/g;
  const addresses: string[] = [];
  for (const match of markdown.matchAll(regex)) {
    const address = match[1];
    if (address) addresses.push(address);
  }

  return {
    all: [...new Set(addresses)]
  };
}

function buildNextActions(checks: Check[], transactions: ProtocolReport["recentTransactions"]): string[] {
  const actions = new Set<string>();
  if (checks.some((check) => check.id === "rpc.receipts" && check.severity !== "pass")) {
    actions.add("设置 BSC_HTTP_RPC，并重新运行 npm run verify:protocol，以核验近期交易回执。");
  }
  if (transactions.every((transaction) => !transaction.matchedKnownContract)) {
    actions.add("启用执行前，至少检查一笔最新市场交易的 BscScan trace，并记录实际调用路径。");
  }
  if (checks.some((check) => check.id === "compare.docsGithub.PowerCurve" && check.severity !== "pass")) {
    actions.add("解决 PowerCurve 官方文档/GitHub 地址不一致问题；分别看待官方文档表里的旧版曲线和 GitHub 的 PowerCurve。");
  }
  if (checks.some((check) => check.severity === "fail")) {
    actions.add("所有失败检查解决前，不要实现或启用实盘执行。");
  }
  actions.add("ABI 必须从官方源码或 BscScan 已验证源码生成，不能手写猜测。");
  return [...actions];
}

function renderMarkdown(report: ProtocolReport): string {
  const checksBySeverity = summarizeChecks(report.checks);
  const blocking = summarizeBlockingChecks(report.checks);
  return `# 最新协议核验报告

生成时间：${report.generatedAt}

实盘执行就绪：**${report.liveReady ? "是" : "否"}**

## 检查摘要

- 通过：${checksBySeverity.pass}
- 警告：${checksBySeverity.warn}
- 失败：${checksBySeverity.fail}
- 实盘阻断未解决项：${blocking.unresolved}
- 非阻断警告：${blocking.nonblockingWarnings}

## 检查项

${report.checks.map((check) => `- ${icon(check.severity)} ${check.blocksLiveExecution ? "[阻断实盘]" : "[非阻断]"} \`${check.id}\`: ${check.summary}${check.details ? ` (${check.details})` : ""}`).join("\n")}

## 近期交易

${report.recentTransactions.length > 0 ? report.recentTransactions.map((tx) => `- \`${tx.hash}\` ${tx.type}，市场 \`${tx.market}\`${tx.to ? `，目标 \`${tx.to}\`` : ""}，命中已知合约=${tx.matchedKnownContract ? "是" : "否"}${tx.matchedLogAddress ? "，通过 log 地址命中=是" : ""}${tx.note ? `；${tx.note}` : ""}`).join("\n") : "- 无"}

## 后续必要动作

${report.nextRequiredActions.map((action) => `- ${action}`).join("\n")}

## 来源

- 官方部署文档：${report.docs.deploymentsUrl}
- 官方 GitHub 部署文件：${report.github.deploymentUrl}
- Router 源码：${report.source.router.url}
- Lens 源码：${report.source.lens.url}
- Controller 源码：${report.source.controller.url}
`;
}

function summarizeChecks(checks: Check[]): Record<Severity, number> {
  return {
    pass: checks.filter((check) => check.severity === "pass").length,
    warn: checks.filter((check) => check.severity === "warn").length,
    fail: checks.filter((check) => check.severity === "fail").length
  };
}

function summarizeBlockingChecks(checks: Check[]): { unresolved: number; nonblockingWarnings: number } {
  return {
    unresolved: checks.filter((check) => check.blocksLiveExecution && check.severity !== "pass").length,
    nonblockingWarnings: checks.filter((check) => !check.blocksLiveExecution && check.severity === "warn").length
  };
}

function icon(severity: Severity): string {
  if (severity === "pass") return "通过";
  if (severity === "warn") return "警告";
  return "失败";
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { accept: "text/plain,*/*" } });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json,*/*" } });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return (await response.json()) as T;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
