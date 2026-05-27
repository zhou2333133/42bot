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

export type TradeSide = "buy" | "sell";

export interface ProtocolGate {
  liveReady: boolean;
  pass: number;
  warn: number;
  fail: number;
  generatedAt?: string;
  reasons: string[];
}

export interface MintQuoteResult {
  side: "buy";
  market: string;
  tokenId: string;
  amountIn: bigint;
  collateralFromUser: bigint;
  collateralToTreasury: bigint;
  collateralToIntegrator: bigint;
  otToUser: bigint;
  minOtOut: bigint;
}

export interface RedeemQuoteResult {
  side: "sell";
  market: string;
  tokenId: string;
  amountIn: bigint;
  collateralToUser: bigint;
  collateralToTreasury: bigint;
  collateralToIntegrator: bigint;
  otFromUser: bigint;
  minCollateralOut: bigint;
}

export type QuoteResult = MintQuoteResult | RedeemQuoteResult;

export interface PreparedTransaction {
  to: string;
  data: `0x${string}`;
  value: bigint;
  description: string;
}

export interface ExecutionReadiness {
  ready: boolean;
  reasons: string[];
}

export type ExecutionCheckStatus = "passed" | "failed" | "skipped";

export interface ExecutionCheck {
  status: ExecutionCheckStatus;
  reason?: string;
  error?: string;
}

export type TransactionKind = "approve" | "operator" | "swap";

export interface PreparedExecutionTransaction extends PreparedTransaction {
  kind: TransactionKind;
  required: boolean;
  preflight: {
    call: ExecutionCheck;
    gas: ExecutionCheck;
    gasUnits?: string;
    gasCostWei?: string;
  };
}

export interface GasReadiness {
  status: ExecutionCheckStatus;
  maxGasGwei: number;
  gasPriceWei?: string;
  gasPriceGwei?: string;
  withinCap: boolean;
  reasons: string[];
}

export interface ExecutionPlan {
  createdAt: string;
  side: TradeSide;
  intent: TradeIntent;
  protocolGate: ProtocolGate;
  risk: RiskDecision;
  readiness: ExecutionReadiness;
  gas: GasReadiness;
  quote?: QuoteResult;
  quoteCheck: ExecutionCheck;
  balanceChecks: ExecutionCheck[];
  transactions: PreparedExecutionTransaction[];
  preconditionsReady: boolean;
  broadcastImplemented: false;
  broadcastReady: false;
  blockedReasons: string[];
}

export interface BotSnapshot {
  updatedAt: string;
  config: {
    liveTrading: boolean;
    killSwitch: boolean;
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
