import type { Activity, Market, Paginated, PricePoint } from "./types.js";

export interface FortyTwoClientOptions {
  baseUrl: string;
  timeoutMs?: number;
}

export class FortyTwoClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: FortyTwoClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 12_000;
  }

  async getMarkets(params: {
    limit?: number;
    offset?: number;
    order?: "created_at" | "volume" | "collateral" | "start_timestamp" | "end_timestamp";
    ascending?: boolean;
    status?: string;
    locale?: string;
  } = {}): Promise<Paginated<Market>> {
    return this.getJson("/api/v1/markets", {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      order: params.order ?? "created_at",
      ascending: params.ascending ?? false,
      status: params.status ?? "all",
      locale: params.locale
    });
  }

  async getMarket(address: string): Promise<Market> {
    return this.getJson(`/api/v1/markets/${address}`);
  }

  async getActivity(params: { market?: string; user?: string; limit?: number; offset?: number } = {}): Promise<Paginated<Activity>> {
    return this.getJson("/api/v1/market-data/activity", {
      market: params.market,
      user: params.user,
      limit: params.limit ?? 100,
      offset: params.offset ?? 0
    });
  }

  async getCurrentPrices(params: {
    market: string;
    tokenId?: string;
    outcomeIndex?: number;
    tokenIds?: string[];
    outcomeIndices?: number[];
    projection?: "full" | "midpoint";
  }): Promise<PricePoint[]> {
    return this.getJson("/api/v1/market-data/prices", {
      market: params.market,
      token_id: params.tokenId,
      outcome_index: params.outcomeIndex,
      token_ids: params.tokenIds?.join(","),
      outcome_indices: params.outcomeIndices?.join(","),
      projection: params.projection
    });
  }

  private async getJson<T>(path: string, query: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`42 REST ${response.status} ${url.pathname}: ${text}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
