import { describe, expect, it } from "vitest";
import { BUSDT_ADDRESS } from "./constants.js";
import { scoreMarket } from "./strategy.js";
import type { Activity, Market } from "./types.js";

const baseMarket: Market = {
  address: "0xmarket",
  questionId: "0xq",
  question: "World Cup final: Argentina vs France?",
  slug: "world-cup-final",
  collateralAddress: BUSDT_ADDRESS,
  collateralSymbol: "USDT",
  collateralDecimals: 18,
  curve: "0xcurve",
  startDate: "2026-05-27T00:00:00Z",
  endDate: "2026-06-01T00:00:00Z",
  status: "live",
  createdAt: "2026-05-27T00:00:00Z",
  updatedAt: "2026-05-27T00:01:00Z",
  volume: 2_000,
  totalMarketCap: 2_000,
  traders: 8,
  contractVersion: 2,
  isFlagged: false,
  categories: ["Sports"],
  subcategories: ["Football"],
  topics: ["FIFA"],
  tags: ["world cup"],
  outcomes: [],
  oracle: { address: "0xoracle" },
  creator: { address: "0xcreator" }
};

const activities: Activity[] = [
  { marketAddress: "0xmarket", questionId: "0xq", timestamp: 1779840001, title: "x", type: "MINT", userAddress: "0x1", collateral: 20 },
  { marketAddress: "0xmarket", questionId: "0xq", timestamp: 1779840002, title: "x", type: "MINT", userAddress: "0x2", collateral: 30 },
  { marketAddress: "0xmarket", questionId: "0xq", timestamp: 1779840003, title: "x", type: "MINT", userAddress: "0x3", collateral: 40 }
];

describe("scoreMarket", () => {
  it("promotes fresh hot live markets with real mints", () => {
    const result = scoreMarket(
      { market: baseMarket, activities },
      { now: new Date("2026-05-27T00:10:00Z"), minCandidateScore: 70 }
    );

    expect(result.action).toBe("candidate");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.metrics.hotKeywordHits).toContain("world cup");
  });

  it("skips markets without real mints when required", () => {
    const result = scoreMarket(
      { market: baseMarket, activities: [] },
      { now: new Date("2026-05-27T00:10:00Z"), requireRealMints: true }
    );

    expect(result.action).toBe("skip");
    expect(result.warnings).toContain("尚无真实 MINT");
  });

  it("skips flagged markets", () => {
    const result = scoreMarket(
      { market: { ...baseMarket, isFlagged: true }, activities },
      { now: new Date("2026-05-27T00:10:00Z") }
    );

    expect(result.action).toBe("skip");
  });
});

