import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { loadConfig } from "./config.js";

const privateKey = "0x0123456789012345678901234567890123456789012345678901234567890123";

describe("loadConfig", () => {
  it("uses the recommended small live-test defaults", () => {
    const config = loadConfig({});

    expect(config.BSC_HTTP_RPC).toBe("https://bsc-dataseed.binance.org");
    expect(config.LIVE_TRADING).toBe(false);
    expect(config.KILL_SWITCH).toBe(true);
    expect(config.MAX_TRADE_USDT).toBe(3);
    expect(config.DAILY_MAX_USDT).toBe(10);
    expect(config.MAX_OPEN_POSITIONS).toBe(1);
    expect(config.MAX_SLIPPAGE_BPS).toBe(500);
    expect(config.MAX_GAS_GWEI).toBe(5);
    expect(config.LIVE_TRADING_CONFIRMATION).toBe("I_UNDERSTAND_42BOT_LIVE_RISK");
  });

  it("derives WALLET_ADDRESS from PRIVATE_KEY when address is omitted", () => {
    const config = loadConfig({ PRIVATE_KEY: privateKey });

    expect(config.PRIVATE_KEY).toBe(privateKey);
    expect(config.WALLET_ADDRESS).toBe(privateKeyToAccount(privateKey).address);
  });

  it("accepts private keys without 0x prefix", () => {
    const config = loadConfig({ PRIVATE_KEY: privateKey.slice(2) });

    expect(config.PRIVATE_KEY).toBe(privateKey);
    expect(config.WALLET_ADDRESS).toBe(privateKeyToAccount(privateKey).address);
  });

  it("keeps an explicit WALLET_ADDRESS when provided", () => {
    const walletAddress = "0x0000000000000000000000000000000000000001";
    const config = loadConfig({ PRIVATE_KEY: privateKey, WALLET_ADDRESS: walletAddress });

    expect(config.WALLET_ADDRESS).toBe(walletAddress);
  });
});
