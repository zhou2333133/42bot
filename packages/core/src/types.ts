export type MarketStatus = "not_started" | "live" | "ended" | "resolved" | "finalised" | "all" | string;

export interface AddressInfo {
  address: string;
  name?: string | null;
  image?: string | null;
}

export interface Outcome {
  holdersAtFinalisation?: number;
  tokenId: string;
  name: string;
  index: number;
  price: number;
  volume: number;
  marketCap: number;
  payout: number;
  mintedQuantity: number;
  symbol: string;
  image?: string;
  translation?: {
    name?: string;
  } | null;
}

export interface Market {
  address: string;
  ancillaryData?: string[];
  availableLocales?: string[];
  questionId: string;
  question: string;
  slug: string;
  collateralAddress: string;
  collateralSymbol: string;
  collateralDecimals: number;
  curve: string;
  description?: string;
  elapsedPct?: number;
  startDate: string;
  endDate: string;
  feeRate?: number;
  finalisedAt?: string;
  image?: string;
  resolutionTime?: string;
  resolvedAnswer?: string;
  sourceLocale?: string;
  status: MarketStatus;
  createdAt: string;
  updatedAt: string;
  volume: number;
  totalMarketCap: number;
  traders: number;
  contractVersion: number;
  isFlagged: boolean;
  categories: string[];
  subcategories: string[];
  topics: string[];
  tags: string[];
  outcomes: Outcome[];
  oracle?: AddressInfo | null;
  creator?: AddressInfo | null;
  proposer?: {
    name?: string | null;
    image?: string | null;
  } | null;
  translation?: {
    title?: string;
    ancillary?: string[];
  } | null;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    totalResults: number;
  };
}

export type ActivityType = "MINT" | "REDEEM" | "FINALISE" | "CLAIM" | string;

export interface Activity {
  avgPrice?: number;
  collateral?: number;
  currentQuantity?: number;
  marketAddress: string;
  marketCapAtTime?: number;
  outcome?: string;
  outcomeImage?: string;
  outcomeIndex?: number;
  outcomeSymbol?: string;
  payoutAtTime?: number;
  price?: number;
  questionId: string;
  realizedPnlDelta?: number;
  size?: number;
  timestamp: number;
  title: string;
  questionImage?: string;
  tokenId?: string;
  tradePrice?: number;
  transactionHash?: string;
  type: ActivityType;
  userAddress?: string;
}

export interface PricePoint {
  market: string;
  mintedQuantity: number;
  outcome: string;
  outcomeCap: number;
  price: number;
  tokenId: string;
  totalMarketCap: number;
  updatedAt: string;
}

export interface MarketWithActivity {
  market: Market;
  activities: Activity[];
}

export interface MarketScore {
  marketAddress: string;
  score: number;
  action: "watch" | "candidate" | "skip";
  reasons: string[];
  warnings: string[];
  metrics: {
    ageMinutes: number;
    mintCount: number;
    redeemCount: number;
    uniqueUsers: number;
    mintCollateral: number;
    volume: number;
    traders: number;
    hotKeywordHits: string[];
  };
}

export interface MarketObservation {
  marketAddress: string;
  question: string;
  status: MarketStatus;
  createdAt: string;
  volume: number;
  traders: number;
  outcomes: Array<{
    name: string;
    tokenId: string;
    price: number;
    mintedQuantity: number;
  }>;
  recentActivity: Activity[];
  prices: PricePoint[];
}

export interface RiskLimits {
  liveTrading: boolean;
  maxTradeUsdt: number;
  dailyMaxUsdt: number;
  maxOpenPositions: number;
  maxSlippageBps: number;
  killSwitch: boolean;
}

export interface RiskState {
  spentTodayUsdt: number;
  openPositions: number;
  consecutiveFailures: number;
}

export interface TradeIntent {
  marketAddress: string;
  tokenId: string;
  amountUsdt: number;
  slippageBps: number;
  reason: string;
}

export interface RiskDecision {
  allowed: boolean;
  reasons: string[];
  mode: "live" | "blocked";
}

export interface BotSnapshot {
  updatedAt: string;
  config: {
    liveTrading: boolean;
    maxTradeUsdt: number;
    dailyMaxUsdt: number;
    maxOpenPositions: number;
    hotMarketMinScore: number;
  };
  status: {
    health: "ok" | "degraded";
    lastPollAt?: string;
    lastError?: string;
    marketsFetched: number;
    activitiesFetched: number;
    durationMs: number;
    source: "rest";
  };
  scores: MarketScore[];
  markets: Market[];
  observations: MarketObservation[];
}
