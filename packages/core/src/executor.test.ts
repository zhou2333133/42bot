import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { decodeFunctionData, type Address, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi, ftRouterV2Abi } from "./abis.js";
import { loadConfig } from "./config.js";
import { BUSDT_ADDRESS, CONTRACT_CANDIDATES } from "./constants.js";
import { LIVE_TRADING_CONFIRMATION_PHRASE, buildExecutionPlan, executePreparedPlan, type BroadcastWalletClient } from "./executor.js";

const market = "0x0000000000000000000000000000000000000002" as Address;
const privateKey = "0x0123456789012345678901234567890123456789012345678901234567890123";
const wallet = privateKeyToAccount(privateKey).address;

describe("buildExecutionPlan", () => {
  it("blocks by default before touching chain preflight", async () => {
    const protocolPath = await writeProtocolReport(true);
    const plan = await buildExecutionPlan({
      config: loadConfig({ PROTOCOL_REPORT_JSON_PATH: protocolPath }),
      intent: {
        marketAddress: market,
        tokenId: "1",
        amountUsdt: 3,
        slippageBps: 500,
        reason: "test"
      },
      skipChainPreflight: true
    });

    expect(plan.preconditionsReady).toBe(false);
    expect(plan.broadcastReady).toBe(false);
    expect(plan.blockedReasons).toContain("LIVE_TRADING 未开启");
    expect(plan.quoteCheck.status).toBe("skipped");
  });

  it("builds a dry-run buy transaction plan when quote and risk gates pass", async () => {
    const protocolPath = await writeProtocolReport(true);
    const plan = await buildExecutionPlan({
      config: loadConfig({
        LIVE_TRADING: "true",
        KILL_SWITCH: "false",
        BSC_HTTP_RPC: "https://example.invalid",
        WALLET_ADDRESS: wallet,
        PRIVATE_KEY: privateKey,
        PROTOCOL_REPORT_JSON_PATH: protocolPath
      }),
      intent: {
        marketAddress: market,
        tokenId: "1",
        amountUsdt: 3,
        slippageBps: 500,
        reason: "test"
      },
      publicClient: fakePublicClient(),
      skipChainPreflight: true
    });

    expect(plan.risk.allowed).toBe(true);
    expect(plan.quoteCheck.status).toBe("passed");
    expect(plan.transactions.map((tx) => tx.kind)).toEqual(["approve", "swap"]);
    expect(plan.broadcastReady).toBe(false);
    expect(plan.broadcastReadiness.reasons.join(" ")).toContain("LIVE_TRADING_CONFIRMATION");

    const approve = plan.transactions[0];
    expect(approve?.to).toBe(BUSDT_ADDRESS);
    const decodedApprove = decodeFunctionData({ abi: erc20Abi, data: approve!.data });
    expect(decodedApprove.functionName).toBe("approve");
    expect(decodedApprove.args).toEqual([CONTRACT_CANDIDATES.routerProxy, 3_000_000_000_000_000_000n]);

    const swap = plan.transactions[1];
    const decodedSwap = decodeFunctionData({ abi: ftRouterV2Abi, data: swap!.data });
    expect(decodedSwap.functionName).toBe("swapMarketV2");
    expect(decodedSwap.args[0]).toBe(market);
    expect(decodedSwap.args[1]).toBe(wallet);
    expect(decodedSwap.args[2]).toBe(1n);
    expect(decodedSwap.args[3]).toEqual({
      isMint: true,
      amount: 3_000_000_000_000_000_000n,
      isExactIn: true,
      minOutOrMaxIn: 950n
    });
  });

  it("blocks when protocol verification is not live-ready", async () => {
    const protocolPath = await writeProtocolReport(false);
    const plan = await buildExecutionPlan({
      config: loadConfig({
        LIVE_TRADING: "true",
        KILL_SWITCH: "false",
        BSC_HTTP_RPC: "https://example.invalid",
        WALLET_ADDRESS: wallet,
        PRIVATE_KEY: "redacted",
        PROTOCOL_REPORT_JSON_PATH: protocolPath
      }),
      intent: {
        marketAddress: market,
        tokenId: "1",
        amountUsdt: 3,
        slippageBps: 500,
        reason: "test"
      },
      publicClient: fakePublicClient(),
      skipChainPreflight: true
    });

    expect(plan.preconditionsReady).toBe(false);
    expect(plan.blockedReasons.join(" ")).toContain("协议核验未 liveReady");
  });

  it("refuses to execute plans without the live confirmation phrase", async () => {
    const protocolPath = await writeProtocolReport(true);
    const config = loadConfig({
      LIVE_TRADING: "true",
      KILL_SWITCH: "false",
      BSC_HTTP_RPC: "https://example.invalid",
      WALLET_ADDRESS: wallet,
      PRIVATE_KEY: privateKey,
      PROTOCOL_REPORT_JSON_PATH: protocolPath
    });
    const plan = await buildExecutionPlan({
      config,
      intent: {
        marketAddress: market,
        tokenId: "1",
        amountUsdt: 3,
        slippageBps: 500,
        reason: "test"
      },
      publicClient: fakePublicClient(),
      skipChainPreflight: true
    });

    const result = await executePreparedPlan({ config, plan, publicClient: fakePublicClient() });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons.join(" ")).toContain("LIVE_TRADING_CONFIRMATION");
  });

  it("still refuses to execute when confirmation is set but preflight did not pass", async () => {
    const protocolPath = await writeProtocolReport(true);
    const config = loadConfig({
      LIVE_TRADING: "true",
      KILL_SWITCH: "false",
      LIVE_TRADING_CONFIRMATION: LIVE_TRADING_CONFIRMATION_PHRASE,
      BSC_HTTP_RPC: "https://example.invalid",
      WALLET_ADDRESS: wallet,
      PRIVATE_KEY: privateKey,
      PROTOCOL_REPORT_JSON_PATH: protocolPath
    });
    const plan = await buildExecutionPlan({
      config,
      intent: {
        marketAddress: market,
        tokenId: "1",
        amountUsdt: 3,
        slippageBps: 500,
        reason: "test"
      },
      publicClient: fakePublicClient(),
      skipChainPreflight: true
    });

    const result = await executePreparedPlan({ config, plan, publicClient: fakePublicClient() });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("execution plan preconditionsReady=false");
    expect(result.blockedReasons).toContain("required transaction eth_call did not pass");
  });

  it("submits required transactions with injected clients only after all gates pass", async () => {
    const protocolPath = await writeProtocolReport(true);
    const config = loadConfig({
      LIVE_TRADING: "true",
      KILL_SWITCH: "false",
      LIVE_TRADING_CONFIRMATION: LIVE_TRADING_CONFIRMATION_PHRASE,
      BSC_HTTP_RPC: "https://example.invalid",
      WALLET_ADDRESS: wallet,
      PRIVATE_KEY: privateKey,
      PROTOCOL_REPORT_JSON_PATH: protocolPath
    });
    const plan = await buildExecutionPlan({
      config,
      intent: {
        marketAddress: market,
        tokenId: "1",
        amountUsdt: 3,
        slippageBps: 500,
        reason: "test"
      },
      publicClient: fakePublicClient({ preflightPasses: true })
    });
    const walletClient = fakeWalletClient();

    expect(plan.preconditionsReady).toBe(true);
    expect(plan.broadcastReady).toBe(true);

    const result = await executePreparedPlan({
      config,
      plan,
      publicClient: fakePublicClient({ preflightPasses: true }),
      walletClient
    });

    expect(result.blockedReasons).toEqual([]);
    expect(result.status).toBe("submitted");
    expect(result.executed.map((tx) => tx.kind)).toEqual(["approve", "swap"]);
    expect(result.executed.map((tx) => tx.hash)).toEqual([
      "0x000000000000000000000000000000000000000000000000000000000000000a",
      "0x000000000000000000000000000000000000000000000000000000000000000b"
    ]);
  });
});

async function writeProtocolReport(liveReady: boolean): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "42bot-protocol-"));
  const path = join(directory, "protocol.json");
  await writeFile(
    path,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      liveReady,
      checks: liveReady
        ? [{ severity: "pass", id: "test", summary: "ok" }]
        : [{ severity: "warn", id: "test", summary: "not ready" }]
    }),
    "utf8"
  );
  return path;
}

function fakePublicClient(options: { preflightPasses?: boolean } = {}): PublicClient {
  return {
    getGasPrice: async () => 1_000_000_000n,
    simulateContract: async () => ({
      result: [
        {},
        {},
        {
          collateralFromUser: 3_000_000_000_000_000_000n,
          collateralToTreasury: 0n,
          collateralToIntegrator: 0n,
          otToUser: 1_000n
        }
      ]
    }),
    readContract: async (params: { functionName?: string }) => {
      if (params.functionName === "allowance") return 0n;
      if (params.functionName === "balanceOf") return 10_000_000_000_000_000_000n;
      if (params.functionName === "isOperator") return false;
      throw new Error(`unexpected read ${String(params.functionName)}`);
    },
    call: async () => {
      if (!options.preflightPasses) throw new Error("preflight disabled in fake client");
      return { data: "0x" };
    },
    estimateGas: async () => {
      if (!options.preflightPasses) throw new Error("preflight disabled in fake client");
      return 100_000n;
    }
  } as unknown as PublicClient;
}

function fakeWalletClient(): BroadcastWalletClient {
  const hashes = [
    "0x000000000000000000000000000000000000000000000000000000000000000a",
    "0x000000000000000000000000000000000000000000000000000000000000000b"
  ] as const;
  let index = 0;
  return {
    sendTransaction: async () => hashes[index++] ?? hashes[1]
  };
}
