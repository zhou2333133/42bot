import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import type { RuntimeSettings, RuntimeSettingsView } from "./types.js";

const runtimeSettingsSchema = z
  .object({
    LIVE_TRADING: z.boolean().optional(),
    KILL_SWITCH: z.boolean().optional(),
    MAX_TRADE_USDT: z.number().min(0.1).max(10_000).optional(),
    DAILY_MAX_USDT: z.number().min(0.1).max(100_000).optional(),
    MAX_OPEN_POSITIONS: z.number().int().min(0).max(100).optional(),
    MAX_SLIPPAGE_BPS: z.number().int().min(0).max(5_000).optional(),
    MAX_GAS_GWEI: z.number().min(0.1).max(1_000).optional(),
    REQUIRE_REAL_MINTS: z.boolean().optional(),
    HOT_MARKET_MIN_SCORE: z.number().int().min(0).max(100).optional(),
    MARKET_LOOKBACK_LIMIT: z.number().int().min(1).max(200).optional(),
    POLL_INTERVAL_MS: z.number().int().min(1_000).max(600_000).optional()
  })
  .strict();

interface RuntimeSettingsFile {
  updatedAt?: string;
  settings?: RuntimeSettings;
}

export class JsonRuntimeSettingsStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<RuntimeSettingsFile> {
    try {
      const text = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(text) as RuntimeSettingsFile;
      return {
        updatedAt: parsed.updatedAt,
        settings: validateRuntimeSettings(parsed.settings ?? {})
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { settings: {} };
      throw error;
    }
  }

  async patch(patch: unknown): Promise<RuntimeSettingsFile> {
    const current = await this.read();
    const incoming = validateRuntimeSettings(patch);
    const next = validateRuntimeSettings({ ...(current.settings ?? {}), ...incoming });
    const payload = {
      updatedAt: new Date().toISOString(),
      settings: next
    };
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return payload;
  }
}

export function validateRuntimeSettings(value: unknown): RuntimeSettings {
  const parsed = runtimeSettingsSchema.parse(value);
  return Object.fromEntries(Object.entries(parsed).filter(([, item]) => item !== undefined)) as RuntimeSettings;
}

export function applyRuntimeSettings(config: AppConfig, settings: RuntimeSettings = {}): AppConfig {
  return {
    ...config,
    ...settings
  };
}

export function buildRuntimeSettingsView(config: AppConfig, file: RuntimeSettingsFile): RuntimeSettingsView {
  const effective = applyRuntimeSettings(config, file.settings);
  return {
    saved: file.settings ?? {},
    updatedAt: file.updatedAt,
    effective: {
      LIVE_TRADING: effective.LIVE_TRADING,
      KILL_SWITCH: effective.KILL_SWITCH,
      MAX_TRADE_USDT: effective.MAX_TRADE_USDT,
      DAILY_MAX_USDT: effective.DAILY_MAX_USDT,
      MAX_OPEN_POSITIONS: effective.MAX_OPEN_POSITIONS,
      MAX_SLIPPAGE_BPS: effective.MAX_SLIPPAGE_BPS,
      MAX_GAS_GWEI: effective.MAX_GAS_GWEI,
      REQUIRE_REAL_MINTS: effective.REQUIRE_REAL_MINTS,
      HOT_MARKET_MIN_SCORE: effective.HOT_MARKET_MIN_SCORE,
      MARKET_LOOKBACK_LIMIT: effective.MARKET_LOOKBACK_LIMIT,
      POLL_INTERVAL_MS: effective.POLL_INTERVAL_MS
    }
  };
}
