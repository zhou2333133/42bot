import type { RiskDecision, RiskLimits, RiskState, TradeIntent } from "./types.js";

export function evaluateRisk(intent: TradeIntent, limits: RiskLimits, state: RiskState): RiskDecision {
  const reasons: string[] = [];

  if (!limits.liveTrading) {
    reasons.push("LIVE_TRADING 未开启");
  }

  if (limits.killSwitch) {
    reasons.push("kill switch 已启用");
  }

  if (intent.amountUsdt <= 0) {
    reasons.push("交易金额必须大于 0");
  }

  if (intent.amountUsdt > limits.maxTradeUsdt) {
    reasons.push(`单笔金额 ${intent.amountUsdt} 超过上限 ${limits.maxTradeUsdt}`);
  }

  if (state.spentTodayUsdt + intent.amountUsdt > limits.dailyMaxUsdt) {
    reasons.push(`今日额度不足: 已用 ${state.spentTodayUsdt}, 本笔 ${intent.amountUsdt}, 上限 ${limits.dailyMaxUsdt}`);
  }

  if (state.openPositions >= limits.maxOpenPositions) {
    reasons.push(`持仓数 ${state.openPositions} 已达上限 ${limits.maxOpenPositions}`);
  }

  if (intent.slippageBps > limits.maxSlippageBps) {
    reasons.push(`滑点 ${intent.slippageBps}bps 超过上限 ${limits.maxSlippageBps}bps`);
  }

  if (state.consecutiveFailures >= 3) {
    reasons.push(`连续失败 ${state.consecutiveFailures} 次，暂停交易`);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    mode: reasons.length === 0 ? "live" : "blocked"
  };
}

