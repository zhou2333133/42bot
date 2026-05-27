import { encodeFunctionData, type Address, type Hex } from "viem";
import { erc20Abi, erc6909Abi, ftRouterV2Abi } from "./abis.js";
import { BUSDT_ADDRESS, CONTRACT_CANDIDATES } from "./constants.js";
import type { MintQuoteResult, PreparedTransaction, RedeemQuoteResult } from "./types.js";

export function buildApproveBusdtTransaction(params: {
  spender?: Address;
  amount: bigint;
}): PreparedTransaction {
  const spender = params.spender ?? (CONTRACT_CANDIDATES.routerProxy as Address);
  return {
    to: BUSDT_ADDRESS,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, params.amount]
    }),
    description: `Approve exact BUSDT amount ${params.amount.toString()} for router ${spender}`
  };
}

export function buildSetOutcomeOperatorTransaction(params: {
  market: Address;
  spender?: Address;
  approved: boolean;
}): PreparedTransaction {
  const spender = params.spender ?? (CONTRACT_CANDIDATES.routerProxy as Address);
  return {
    to: params.market,
    value: 0n,
    data: encodeFunctionData({
      abi: erc6909Abi,
      functionName: "setOperator",
      args: [spender, params.approved]
    }),
    description: `Set outcome token operator ${spender}=${params.approved}`
  };
}

export function buildBuySwapTransaction(params: {
  market: Address;
  receiver: Address;
  quote: MintQuoteResult;
  router?: Address;
  integrator?: Address;
  integratorFeeBps?: number;
  dataSwap?: Hex;
  dataGuess?: Hex;
}): PreparedTransaction {
  return buildSwapMarketV2({
    market: params.market,
    receiver: params.receiver,
    tokenId: BigInt(params.quote.tokenId),
    isMint: true,
    amount: params.quote.amountIn,
    isExactIn: true,
    minOutOrMaxIn: params.quote.minOtOut,
    router: params.router,
    integrator: params.integrator,
    integratorFeeBps: params.integratorFeeBps,
    dataSwap: params.dataSwap,
    dataGuess: params.dataGuess,
    description: `Buy outcome ${params.quote.tokenId} on ${params.market}`
  });
}

export function buildSellSwapTransaction(params: {
  market: Address;
  receiver: Address;
  quote: RedeemQuoteResult;
  router?: Address;
  integrator?: Address;
  integratorFeeBps?: number;
  dataSwap?: Hex;
  dataGuess?: Hex;
}): PreparedTransaction {
  return buildSwapMarketV2({
    market: params.market,
    receiver: params.receiver,
    tokenId: BigInt(params.quote.tokenId),
    isMint: false,
    amount: params.quote.amountIn,
    isExactIn: true,
    minOutOrMaxIn: params.quote.minCollateralOut,
    router: params.router,
    integrator: params.integrator,
    integratorFeeBps: params.integratorFeeBps,
    dataSwap: params.dataSwap,
    dataGuess: params.dataGuess,
    description: `Sell outcome ${params.quote.tokenId} on ${params.market}`
  });
}

function buildSwapMarketV2(params: {
  market: Address;
  receiver: Address;
  tokenId: bigint;
  isMint: boolean;
  amount: bigint;
  isExactIn: boolean;
  minOutOrMaxIn: bigint;
  router?: Address;
  integrator?: Address;
  integratorFeeBps?: number;
  dataSwap?: Hex;
  dataGuess?: Hex;
  description: string;
}): PreparedTransaction {
  const router = params.router ?? (CONTRACT_CANDIDATES.routerProxy as Address);
  const integrator = params.integrator ?? "0x0000000000000000000000000000000000000000";
  return {
    to: router,
    value: 0n,
    data: encodeFunctionData({
      abi: ftRouterV2Abi,
      functionName: "swapMarketV2",
      args: [
        params.market,
        params.receiver,
        params.tokenId,
        {
          isMint: params.isMint,
          amount: params.amount,
          isExactIn: params.isExactIn,
          minOutOrMaxIn: params.minOutOrMaxIn
        },
        params.dataSwap ?? "0x",
        params.dataGuess ?? "0x",
        integrator,
        BigInt(params.integratorFeeBps ?? 0)
      ]
    }),
    description: params.description
  };
}
