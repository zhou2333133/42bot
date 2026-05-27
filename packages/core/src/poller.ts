import type { AppConfig } from "./config.js";
import { FortyTwoClient } from "./rest-client.js";
import { scoreMarket } from "./strategy.js";
import type { BotSnapshot, MarketObservation, MarketWithActivity } from "./types.js";

export async function buildSnapshot(config: AppConfig, client = new FortyTwoClient({ baseUrl: config.FORTYTWO_REST_BASE })): Promise<BotSnapshot> {
  const startedAt = Date.now();
  let activitiesFetched = 0;

  const marketsResponse = await client.getMarkets({
    limit: config.MARKET_LOOKBACK_LIMIT,
    order: "created_at",
    ascending: false,
    status: "all"
  });

  const markets = marketsResponse.data;
  const marketsForDeepScan = markets.slice(0, Math.min(markets.length, 12));
  const marketInputs = await mapWithConcurrency(marketsForDeepScan, 4, async (market): Promise<MarketWithActivity> => {
    const activityResponse = await client.getActivity({ market: market.address, limit: 200 });
    activitiesFetched += activityResponse.data.length;
    return { market, activities: activityResponse.data };
  });

  const scores = marketInputs.map((input) =>
    scoreMarket(input, {
      requireRealMints: config.REQUIRE_REAL_MINTS,
      minCandidateScore: config.HOT_MARKET_MIN_SCORE
    })
  );
  const topCandidates = [...marketInputs]
    .sort((left, right) => {
      const leftScore = scores.find((score) => score.marketAddress === left.market.address)?.score ?? 0;
      const rightScore = scores.find((score) => score.marketAddress === right.market.address)?.score ?? 0;
      return rightScore - leftScore;
    })
    .slice(0, 6);
  const observations = await mapWithConcurrency(topCandidates, 3, async (input): Promise<MarketObservation> => {
    let prices: MarketObservation["prices"] = [];
    try {
      prices = await client.getCurrentPrices({ market: input.market.address });
    } catch {
      prices = [];
    }

    return {
      marketAddress: input.market.address,
      question: input.market.translation?.title ?? input.market.question,
      status: input.market.status,
      createdAt: input.market.createdAt,
      volume: input.market.volume,
      traders: input.market.traders,
      outcomes: input.market.outcomes.map((outcome) => ({
        name: outcome.translation?.name ?? outcome.name,
        tokenId: outcome.tokenId,
        price: outcome.price,
        mintedQuantity: outcome.mintedQuantity
      })),
      recentActivity: input.activities.slice(0, 20),
      prices
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    config: {
      liveTrading: config.LIVE_TRADING,
      maxTradeUsdt: config.MAX_TRADE_USDT,
      dailyMaxUsdt: config.DAILY_MAX_USDT,
      maxOpenPositions: config.MAX_OPEN_POSITIONS,
      hotMarketMinScore: config.HOT_MARKET_MIN_SCORE
    },
    status: {
      health: "ok",
      lastPollAt: new Date().toISOString(),
      marketsFetched: markets.length,
      activitiesFetched,
      durationMs: Date.now() - startedAt,
      source: "rest"
    },
    markets,
    scores,
    observations
  };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await mapper(item, index);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
