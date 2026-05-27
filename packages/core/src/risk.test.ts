import { describe, expect, it } from "vitest";
import { evaluateRisk } from "./risk.js";

describe("evaluateRisk", () => {
  it("blocks trading when live mode is off", () => {
    const decision = evaluateRisk(
      { marketAddress: "0xmarket", tokenId: "1", amountUsdt: 5, slippageBps: 500, reason: "test" },
      { liveTrading: false, killSwitch: false, maxTradeUsdt: 5, dailyMaxUsdt: 30, maxOpenPositions: 3, maxSlippageBps: 1000 },
      { spentTodayUsdt: 0, openPositions: 0, consecutiveFailures: 0 }
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("LIVE_TRADING 未开启");
  });

  it("allows a trade inside all limits when live mode is on", () => {
    const decision = evaluateRisk(
      { marketAddress: "0xmarket", tokenId: "1", amountUsdt: 5, slippageBps: 500, reason: "test" },
      { liveTrading: true, killSwitch: false, maxTradeUsdt: 5, dailyMaxUsdt: 30, maxOpenPositions: 3, maxSlippageBps: 1000 },
      { spentTodayUsdt: 0, openPositions: 0, consecutiveFailures: 0 }
    );

    expect(decision.allowed).toBe(true);
  });
});

