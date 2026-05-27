import { describe, expect, it } from "vitest";
import { decodeFunctionData } from "viem";
import { erc20Abi, ftRouterV2Abi } from "./abis.js";
import { BUSDT_ADDRESS, CONTRACT_CANDIDATES } from "./constants.js";
import { buildApproveBusdtTransaction, buildBuySwapTransaction } from "./tx-builder.js";
import type { MintQuoteResult } from "./types.js";

describe("tx builder", () => {
  it("builds exact BUSDT approve transactions", () => {
    const tx = buildApproveBusdtTransaction({ amount: 123n });
    expect(tx.to).toBe(BUSDT_ADDRESS);

    const decoded = decodeFunctionData({ abi: erc20Abi, data: tx.data });
    expect(decoded.functionName).toBe("approve");
    expect(decoded.args).toEqual([CONTRACT_CANDIDATES.routerProxy, 123n]);
  });

  it("builds swapMarketV2 buy calldata with slippage min out", () => {
    const quote: MintQuoteResult = {
      side: "buy",
      market: "0x0000000000000000000000000000000000000002",
      tokenId: "1",
      amountIn: 100n,
      collateralFromUser: 100n,
      collateralToTreasury: 1n,
      collateralToIntegrator: 0n,
      otToUser: 50n,
      minOtOut: 45n
    };

    const tx = buildBuySwapTransaction({
      market: quote.market as `0x${string}`,
      receiver: "0x0000000000000000000000000000000000000001",
      quote
    });
    const decoded = decodeFunctionData({ abi: ftRouterV2Abi, data: tx.data });
    expect(tx.to).toBe(CONTRACT_CANDIDATES.routerProxy);
    expect(decoded.functionName).toBe("swapMarketV2");
    expect(decoded.args[2]).toBe(1n);
    expect(decoded.args[3]).toEqual({ isMint: true, amount: 100n, isExactIn: true, minOutOrMaxIn: 45n });
  });
});
