import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { decodeFunctionData, type Address, type PublicClient } from "viem";
import { erc20Abi, ftRouterV2Abi } from "./abis.js";
import { loadConfig } from "./config.js";
import { BUSDT_ADDRESS, CONTRACT_CANDIDATES } from "./constants.js";
import { buildExecutionPlan } from "./executor.js";

const market = "0x0000000000000000000000000000000000000002" as Address;
const wallet = "0x0000000000000000000000000000000000000001" as Address;

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

    expect(plan.risk.allowed).toBe(true);
    expect(plan.quoteCheck.status).toBe("passed");
    expect(plan.transactions.map((tx) => tx.kind)).toEqual(["approve", "swap"]);
    expect(plan.broadcastReady).toBe(false);

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

function fakePublicClient(): PublicClient {
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
    }
  } as unknown as PublicClient;
}
