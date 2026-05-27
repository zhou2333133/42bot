import "dotenv/config";
import { isAbsolute, resolve } from "node:path";
import { z } from "zod";

const booleanString = z
  .preprocess((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return false;
    return value.toLowerCase() === "true";
  }, z.boolean());

const numberString = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === "") return fallback;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      return parsed;
    });

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  FORTYTWO_REST_BASE: z.string().url().default("https://rest.ft.42.space"),
  BSC_HTTP_RPC: z.string().optional().default(""),
  BSC_WS_RPC: z.string().optional().default(""),
  WALLET_ADDRESS: z.string().optional().default(""),
  PRIVATE_KEY: z.string().optional().default(""),
  LIVE_TRADING: booleanString.default(false),
  MAX_TRADE_USDT: numberString(5),
  DAILY_MAX_USDT: numberString(30),
  MAX_OPEN_POSITIONS: numberString(3),
  MAX_SLIPPAGE_BPS: numberString(1000),
  MAX_GAS_GWEI: numberString(5),
  KILL_SWITCH: booleanString.default(true),
  INTEGRATOR_ADDRESS: z.string().optional().default(""),
  INTEGRATOR_FEE_BPS: numberString(0),
  PROTOCOL_REPORT_JSON_PATH: z.string().default("./data/protocol-verification-latest.json"),
  REQUIRE_REAL_MINTS: booleanString.default(true),
  HOT_MARKET_MIN_SCORE: numberString(70),
  MARKET_LOOKBACK_LIMIT: numberString(50),
  POLL_INTERVAL_MS: numberString(10000),
  STATE_FILE: z.string().default("./data/state.json"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: numberString(4210),
  VITE_API_BASE: z.string().default("http://localhost:4210")
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const basePath = env.PROJECT_ROOT || env.INIT_CWD || process.cwd();
  return {
    ...parsed,
    PROTOCOL_REPORT_JSON_PATH: resolveConfigPath(parsed.PROTOCOL_REPORT_JSON_PATH, basePath),
    STATE_FILE: resolveConfigPath(parsed.STATE_FILE, basePath)
  };
}

export function redactConfig(
  config: AppConfig
): Omit<AppConfig, "PRIVATE_KEY" | "BSC_HTTP_RPC" | "BSC_WS_RPC"> & { PRIVATE_KEY: string; BSC_HTTP_RPC: string; BSC_WS_RPC: string } {
  return {
    ...config,
    BSC_HTTP_RPC: config.BSC_HTTP_RPC ? "[redacted]" : "",
    BSC_WS_RPC: config.BSC_WS_RPC ? "[redacted]" : "",
    PRIVATE_KEY: config.PRIVATE_KEY ? "[redacted]" : ""
  };
}

function resolveConfigPath(value: string, basePath: string): string {
  return isAbsolute(value) ? value : resolve(basePath, value);
}
