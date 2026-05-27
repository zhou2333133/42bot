import { isAddress } from "viem";
import type { AppConfig } from "./config.js";
import type { ExecutionReadiness, ProtocolGate, RiskDecision } from "./types.js";

export function evaluateExecutionReadiness(config: AppConfig, protocolGate: ProtocolGate, riskDecision?: RiskDecision): ExecutionReadiness {
  const reasons: string[] = [];

  if (!config.LIVE_TRADING) reasons.push("LIVE_TRADING 未开启");
  if (!config.BSC_HTTP_RPC) reasons.push("BSC_HTTP_RPC 未配置");
  if (!config.WALLET_ADDRESS || !isAddress(config.WALLET_ADDRESS)) reasons.push("WALLET_ADDRESS 未配置或格式错误");
  if (!config.PRIVATE_KEY) reasons.push("PRIVATE_KEY 未配置");
  if (!protocolGate.liveReady) {
    reasons.push(`协议核验未 liveReady: ${protocolGate.reasons.join("; ") || "unknown"}`);
  }
  if (riskDecision && !riskDecision.allowed) {
    reasons.push(...riskDecision.reasons);
  }

  return {
    ready: reasons.length === 0,
    reasons
  };
}
