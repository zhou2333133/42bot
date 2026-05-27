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
      summary: `docs deployment contains ${address}`,
      details: blocksLiveExecution ? "critical execution path address" : "noncritical reference/deprecated/curve address",
      blocksLiveExecution
    };
  });
}

function checkGithubDeployment(deployment: GithubDeployment): Check[] {
  const checks: Check[] = [];
  checks.push({
    id: "github.chain",
    severity: deployment.network?.chainId === 56 ? "pass" : "fail",
    summary: `github deployment chainId=${deployment.network?.chainId ?? "missing"}`,
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
      summary: `${name}=${address ?? "missing"}`,
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
      summary: `${name} docs/github address alignment`,
      details: address ? `${address}` : "missing in github deployment",
      blocksLiveExecution
    });
  }

  const githubPowerCurve = deployment.PowerCurve?.[0]?.addy;
  const githubLegacyPowerCurve = deployment.PowerCurveLegacy?.[0]?.addy;
  checks.push({
    id: "compare.docsGithub.PowerCurve",
    severity: githubPowerCurve && docsSet.has(githubPowerCurve.toLowerCase()) ? "pass" : "warn",
    summary: "PowerCurve docs/github address alignment",
    details: `github PowerCurve=${githubPowerCurve ?? "missing"}, github legacy=${githubLegacyPowerCurve ?? "missing"}. Noncritical for current Router/Lens buy preflight; keep monitoring before relying on curve-specific logic.`,
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
      summary: "No recent REST activity transactions with hashes found",
      blocksLiveExecution: true
    });
    return [];
  }

  checks.push({
    id: "activity.transactions",
    severity: "pass",
    summary: `Found ${withHash.length} recent REST activity transactions with hashes`,
    blocksLiveExecution: true
  });

  if (!rpcUrl) {
    checks.push({
      id: "rpc.receipts",
      severity: "warn",
      summary: "BSC_HTTP_RPC missing; transaction receipt checks skipped",
      details: "Set BSC_HTTP_RPC in .env to verify recent activity transaction destinations and status.",
      blocksLiveExecution: true
    });
    return withHash.map((item) => ({
      hash: item.transactionHash!,
      market: item.marketAddress,
      type: item.type,
      matchedKnownContract: false,
      note: "receipt skipped because BSC_HTTP_RPC is unset"
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
        note: error instanceof Error ? error.message : "unknown receipt error"
      });
    }
  }

  const matched = transactions.filter((item) => item.matchedKnownContract).length;
  const matchedViaLogs = transactions.filter((item) => item.matchedLogAddress).length;
  checks.push({
    id: "rpc.receipts",
    severity: matched > 0 ? "pass" : "warn",
    summary: `Receipt checks matched ${matched}/${transactions.length} known router/controller/market paths`,
    details:
      matched === 0
        ? "Transactions may call market contracts directly or receipts need deeper trace/BscScan inspection."
        : `${matchedViaLogs}/${transactions.length} matched via receipt log addresses, which covers Binance Wallet/account-router style transactions.`,
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
    summary: `${sourceKey} source token check ${found.length}/${requiredTokens.length}`,
    details: missing.length > 0 ? `Missing: ${missing.join(", ")}` : undefined,
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
    actions.add("Set BSC_HTTP_RPC and rerun npm run verify:protocol to verify recent transaction receipts.");
  }
  if (transactions.every((transaction) => !transaction.matchedKnownContract)) {
    actions.add("Inspect one latest market transaction trace on BscScan and record the actual call path before enabling execution.");
  }
  if (checks.some((check) => check.id === "compare.docsGithub.PowerCurve" && check.severity !== "pass")) {
    actions.add("Resolve PowerCurve docs/github address mismatch; treat docs table legacy curve and github PowerCurve separately.");
  }
  if (checks.some((check) => check.severity === "fail")) {
    actions.add("Do not implement live execution until all fail checks are resolved.");
  }
  actions.add("Generate ABI from official sources or verified BscScan source in Phase 3; do not handwrite ABI.");
  return [...actions];
}

function renderMarkdown(report: ProtocolReport): string {
  const checksBySeverity = summarizeChecks(report.checks);
  const blocking = summarizeBlockingChecks(report.checks);
  return `# Protocol Verification Latest

Generated at: ${report.generatedAt}

Live execution ready: **${report.liveReady ? "YES" : "NO"}**

## Check Summary

- pass: ${checksBySeverity.pass}
- warn: ${checksBySeverity.warn}
- fail: ${checksBySeverity.fail}
- blocking unresolved: ${blocking.unresolved}
- nonblocking warnings: ${blocking.nonblockingWarnings}

## Checks

${report.checks.map((check) => `- ${icon(check.severity)} ${check.blocksLiveExecution ? "[BLOCKS-LIVE]" : "[NONBLOCKING]"} \`${check.id}\`: ${check.summary}${check.details ? ` (${check.details})` : ""}`).join("\n")}

## Recent Transactions

${report.recentTransactions.length > 0 ? report.recentTransactions.map((tx) => `- \`${tx.hash}\` ${tx.type} market \`${tx.market}\`${tx.to ? ` to \`${tx.to}\`` : ""} matchedKnownContract=${tx.matchedKnownContract}${tx.matchedLogAddress ? " matchedLogAddress=true" : ""}${tx.note ? `; ${tx.note}` : ""}`).join("\n") : "- None"}

## Next Required Actions

${report.nextRequiredActions.map((action) => `- ${action}`).join("\n")}

## Sources

- Official deployments: ${report.docs.deploymentsUrl}
- Official GitHub deployment: ${report.github.deploymentUrl}
- Router source: ${report.source.router.url}
- Lens source: ${report.source.lens.url}
- Controller source: ${report.source.controller.url}
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
  if (severity === "pass") return "PASS";
  if (severity === "warn") return "WARN";
  return "FAIL";
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
