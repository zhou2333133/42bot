import { createPublicClient, http, type Address, type Hex, type PublicClient } from "viem";
import { bsc } from "viem/chains";
import { ftLensV2Abi } from "./abis.js";
import { CONTRACT_CANDIDATES } from "./constants.js";
import { applySlippageFloor, usdtToUnits } from "./amounts.js";
import type { MintQuoteResult, RedeemQuoteResult } from "./types.js";

interface QuoteOptions {
  rpcUrl: string;
  lensAddress?: Address;
  integratorFeeBps?: number;
  dataSwap?: Hex;
  dataGuess?: Hex;
  publicClient?: PublicClient;
}

export async function quoteMintExactUsdt(params: {
  market: Address;
  tokenId: bigint;
  amountUsdt: number;
  slippageBps: number;
  options: QuoteOptions;
}): Promise<MintQuoteResult> {
  const amountIn = usdtToUnits(params.amountUsdt);
  const client = params.options.publicClient ?? createBscClient(params.options.rpcUrl);
  const simulated = await client.simulateContract({
    address: params.options.lensAddress ?? (CONTRACT_CANDIDATES.lensV2 as Address),
    abi: ftLensV2Abi,
    functionName: "simulateMint",
    args: [
      params.market,
      params.tokenId,
      amountIn,
      true,
      params.options.dataSwap ?? "0x",
      params.options.dataGuess ?? "0x",
      BigInt(params.options.integratorFeeBps ?? 0)
    ]
  });
  const [, , quote] = simulated.result;

  return {
    side: "buy",
    market: params.market,
    tokenId: params.tokenId.toString(),
    amountIn,
    collateralFromUser: quote.collateralFromUser,
    collateralToTreasury: quote.collateralToTreasury,
    collateralToIntegrator: quote.collateralToIntegrator,
    otToUser: quote.otToUser,
    minOtOut: applySlippageFloor(quote.otToUser, params.slippageBps)
  };
}

export async function quoteRedeemExactOt(params: {
  market: Address;
  tokenId: bigint;
  otAmount: bigint;
  slippageBps: number;
  options: QuoteOptions;
}): Promise<RedeemQuoteResult> {
  const client = params.options.publicClient ?? createBscClient(params.options.rpcUrl);
  const simulated = await client.simulateContract({
    address: params.options.lensAddress ?? (CONTRACT_CANDIDATES.lensV2 as Address),
    abi: ftLensV2Abi,
    functionName: "simulateRedeem",
    args: [
      params.market,
      params.tokenId,
      params.otAmount,
      true,
      params.options.dataSwap ?? "0x",
      params.options.dataGuess ?? "0x",
      BigInt(params.options.integratorFeeBps ?? 0)
    ]
  });
  const [, , quote] = simulated.result;

  return {
    side: "sell",
    market: params.market,
    tokenId: params.tokenId.toString(),
    amountIn: params.otAmount,
    collateralToUser: quote.collateralToUser,
    collateralToTreasury: quote.collateralToTreasury,
    collateralToIntegrator: quote.collateralToIntegrator,
    otFromUser: quote.otFromUser,
    minCollateralOut: applySlippageFloor(quote.collateralToUser, params.slippageBps)
  };
}

function createBscClient(rpcUrl: string): PublicClient {
  if (!rpcUrl) throw new Error("rpcUrl is required for quoting");
  return createPublicClient({ chain: bsc, transport: http(rpcUrl) });
}
