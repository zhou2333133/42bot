import { BUSDT_ADDRESS } from "./constants.js";
import type { Activity, Market, MarketScore, MarketWithActivity } from "./types.js";

export interface StrategyOptions {
  now?: Date;
  maxAgeMinutes?: number;
  requireRealMints?: boolean;
  minCandidateScore?: number;
  trustedOracleAddresses?: string[];
  trustedCreatorAddresses?: string[];
  blockedOracleAddresses?: string[];
  blockedCreatorAddresses?: string[];
}

const HOT_KEYWORDS = [
  "world cup",
  "世界杯",
  "football",
  "soccer",
  "fifa",
  "binance",
  "cz",
  "elon",
  "musk",
  "vitalik",
  "ethereum",
  "eth",
  "bitcoin",
  "btc",
  "sol",
  "election",
  "tweet",
  "crypto"
];

export function scoreMarket(input: MarketWithActivity, options: StrategyOptions = {}): MarketScore {
  const now = options.now ?? new Date();
  const maxAgeMinutes = options.maxAgeMinutes ?? 180;
  const minCandidateScore = options.minCandidateScore ?? 70;
  const requireRealMints = options.requireRealMints ?? true;
  const { market, activities } = input;

  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const ageMinutes = Math.max(0, (now.getTime() - new Date(market.createdAt).getTime()) / 60_000);
  const mints = activities.filter((activity) => activity.type === "MINT");
  const redeems = activities.filter((activity) => activity.type === "REDEEM");
  const uniqueUsers = new Set(activities.map((activity) => activity.userAddress?.toLowerCase()).filter(Boolean)).size;
  const mintCollateral = sum(mints.map((activity) => activity.collateral ?? 0));
  const hotKeywordHits = findHotKeywordHits(market);

  if (market.status === "live") {
    score += 18;
    reasons.push("市场处于 live 状态");
  } else {
    warnings.push(`市场状态为 ${market.status}`);
  }

  if (market.contractVersion === 2) {
    score += 8;
    reasons.push("V2 市场");
  } else {
    warnings.push(`非 V2 市场: ${market.contractVersion}`);
  }

  if (sameAddress(market.collateralAddress, BUSDT_ADDRESS)) {
    score += 8;
    reasons.push("抵押资产为 BUSDT");
  } else {
    warnings.push("抵押资产不是已确认 BUSDT");
  }

  if (!market.isFlagged) {
    score += 8;
  } else {
    warnings.push("市场被 flagged");
    score -= 40;
  }

  if (ageMinutes <= maxAgeMinutes) {
    score += ageMinutes <= 30 ? 16 : 10;
    reasons.push(`新盘年龄 ${ageMinutes.toFixed(1)} 分钟`);
  } else {
    warnings.push(`市场过旧 ${ageMinutes.toFixed(1)} 分钟`);
  }

  if (hotKeywordHits.length > 0) {
    score += Math.min(18, hotKeywordHits.length * 5);
    reasons.push(`高传播关键词: ${hotKeywordHits.join(", ")}`);
  }

  if (mints.length > 0) {
    score += Math.min(18, 4 + mints.length * 2);
    reasons.push(`发现真实 MINT ${mints.length} 笔`);
  } else if (requireRealMints) {
    warnings.push("尚无真实 MINT");
    score -= 20;
  }

  if (uniqueUsers >= 3) {
    score += Math.min(12, uniqueUsers * 2);
    reasons.push(`独立参与者 ${uniqueUsers}`);
  } else {
    warnings.push(`独立参与者较少: ${uniqueUsers}`);
  }

  if (market.volume >= 1_000 || mintCollateral >= 100) {
    score += 10;
    reasons.push("成交/铸造资金已有初始热度");
  }

  if (redeems.length > mints.length && mints.length > 0) {
    score -= 12;
    warnings.push("REDEEM 多于 MINT，热度可能衰退");
  }

  if (isListedAddress(market.oracle?.address, options.trustedOracleAddresses)) {
    score += 8;
    reasons.push("oracle 在白名单");
  }

  if (isListedAddress(market.creator?.address, options.trustedCreatorAddresses)) {
    score += 8;
    reasons.push("creator 在白名单");
  }

  if (isListedAddress(market.oracle?.address, options.blockedOracleAddresses)) {
    score -= 100;
    warnings.push("oracle 在黑名单");
  }

  if (isListedAddress(market.creator?.address, options.blockedCreatorAddresses)) {
    score -= 100;
    warnings.push("creator 在黑名单");
  }

  score = Math.max(0, Math.min(100, score));

  let action: MarketScore["action"] = "watch";
  if (score >= minCandidateScore && warnings.length <= 2) action = "candidate";
  if (market.status !== "live" || market.isFlagged || (requireRealMints && mints.length === 0)) action = "skip";

  return {
    marketAddress: market.address,
    score,
    action,
    reasons,
    warnings,
    metrics: {
      ageMinutes,
      mintCount: mints.length,
      redeemCount: redeems.length,
      uniqueUsers,
      mintCollateral,
      volume: market.volume,
      traders: market.traders,
      hotKeywordHits
    }
  };
}

function findHotKeywordHits(market: Market): string[] {
  const haystack = [
    market.question,
    ...market.categories,
    ...market.subcategories,
    ...market.topics,
    ...market.tags
  ]
    .join(" ")
    .toLowerCase();
  return HOT_KEYWORDS.filter((keyword) => haystack.includes(keyword.toLowerCase()));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sameAddress(left?: string | null, right?: string | null): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function isListedAddress(address: string | undefined | null, addresses: string[] | undefined): boolean {
  if (!address || !addresses?.length) return false;
  const lower = address.toLowerCase();
  return addresses.some((candidate) => candidate.toLowerCase() === lower);
}

export function summarizeActivities(activities: Activity[]): { mintCount: number; redeemCount: number; uniqueUsers: number } {
  return {
    mintCount: activities.filter((activity) => activity.type === "MINT").length,
    redeemCount: activities.filter((activity) => activity.type === "REDEEM").length,
    uniqueUsers: new Set(activities.map((activity) => activity.userAddress?.toLowerCase()).filter(Boolean)).size
  };
}

