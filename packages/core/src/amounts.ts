import { parseUnits } from "viem";

export function usdtToUnits(amountUsdt: number, decimals = 18): bigint {
  if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
    throw new Error(`invalid USDT amount: ${amountUsdt}`);
  }

  return parseUnits(amountUsdt.toFixed(6), decimals);
}

export function applySlippageFloor(amount: bigint, slippageBps: number): bigint {
  validateBps(slippageBps);
  return (amount * BigInt(10_000 - slippageBps)) / 10_000n;
}

export function applySlippageCeiling(amount: bigint, slippageBps: number): bigint {
  validateBps(slippageBps);
  return (amount * BigInt(10_000 + slippageBps) + 9_999n) / 10_000n;
}

function validateBps(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`invalid slippage bps: ${value}`);
  }
}
