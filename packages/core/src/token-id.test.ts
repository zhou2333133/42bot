import { describe, expect, it } from "vitest";
import { outcomeIndexFromTokenId, tokenIdFromOutcomeIndex } from "./token-id.js";

describe("token id mapping", () => {
  it("maps zero-based outcome indexes to powers of two", () => {
    expect(tokenIdFromOutcomeIndex(0)).toBe(1n);
    expect(tokenIdFromOutcomeIndex(1)).toBe(2n);
    expect(tokenIdFromOutcomeIndex(5)).toBe(32n);
  });

  it("maps token ids back to indexes", () => {
    expect(outcomeIndexFromTokenId(1n)).toBe(0);
    expect(outcomeIndexFromTokenId(2n)).toBe(1);
    expect(outcomeIndexFromTokenId(32n)).toBe(5);
  });

  it("rejects non-power-of-two token ids", () => {
    expect(() => outcomeIndexFromTokenId(3n)).toThrow("invalid token id");
  });
});
