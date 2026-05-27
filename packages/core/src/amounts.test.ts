import { describe, expect, it } from "vitest";
import { applySlippageCeiling, applySlippageFloor, usdtToUnits } from "./amounts.js";

describe("amount helpers", () => {
  it("converts USDT into 18-decimal BSC units", () => {
    expect(usdtToUnits(1)).toBe(1_000_000_000_000_000_000n);
    expect(usdtToUnits(1.25)).toBe(1_250_000_000_000_000_000n);
  });

  it("applies slippage floors and ceilings", () => {
    expect(applySlippageFloor(1_000n, 100)).toBe(990n);
    expect(applySlippageCeiling(1_000n, 100)).toBe(1_010n);
  });

  it("rejects invalid bps values", () => {
    expect(() => applySlippageFloor(1_000n, 10_001)).toThrow("invalid slippage bps");
  });
});
