import React from "react";
import { createRoot } from "react-dom/client";
import { Activity, AlertTriangle, BarChart3, PauseCircle, Radio, RefreshCw, ShieldCheck, TerminalSquare, Zap } from "lucide-react";
import "./styles.css";

type MarketStatus = "not_started" | "live" | "ended" | "resolved" | "finalised" | "all" | string;

interface Outcome {
  tokenId: string;
  name: string;
  index: number;
  price: number;
  volume: number;
  marketCap: number;
  payout: number;
  mintedQuantity: number;
  symbol: string;
}

interface Market {
  address: string;
  questionId: string;
  question: string;
  slug: string;
  collateralAddress: string;
  collateralSymbol: string;
  collateralDecimals: number;
  curve: string;
  startDate: string;
  endDate: string;
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
}

interface ActivityItem {
  marketAddress: string;
  questionId: string;
  timestamp: number;
  title: string;
  type: string;
  userAddress?: string;
  collateral?: number;
  transactionHash?: string;
}

interface MarketScore {
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

interface MarketObservation {
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
  recentActivity: ActivityItem[];
  prices: Array<{
    market: string;
    mintedQuantity: number;
    outcome: string;
    outcomeCap: number;
    price: number;
    tokenId: string;
    totalMarketCap: number;
    updatedAt: string;
  }>;
}

interface BotSnapshot {
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

interface ExecutionPlan {
  createdAt: string;
  side: "buy" | "sell";
  risk: {
    allowed: boolean;
    reasons: string[];
  };
  readiness: {
    ready: boolean;
    reasons: string[];
  };
  gas: {
    status: "passed" | "failed" | "skipped";
    maxGasGwei: number;
    gasPriceGwei?: string;
    withinCap: boolean;
    reasons: string[];
  };
  quoteCheck: {
    status: "passed" | "failed" | "skipped";
    reason?: string;
    error?: string;
  };
  transactions: Array<{
    kind: "approve" | "operator" | "swap";
    to: string;
    description: string;
    required: boolean;
    preflight: {
      call: { status: string; reason?: string; error?: string };
      gas: { status: string; reason?: string; error?: string };
      gasUnits?: string;
      gasCostWei?: string;
    };
  }>;
  preconditionsReady: boolean;
  broadcastReady: boolean;
  broadcastReadiness: {
    ready: boolean;
    configured: boolean;
    requiredConfirmation: string;
    reasons: string[];
  };
  blockedReasons: string[];
}

const apiBase = import.meta.env.VITE_API_BASE ?? "http://localhost:4210";

function App() {
  const [snapshot, setSnapshot] = React.useState<BotSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [executionPlan, setExecutionPlan] = React.useState<ExecutionPlan | null>(null);
  const [planError, setPlanError] = React.useState<string | null>(null);
  const [planning, setPlanning] = React.useState(false);

  const loadSnapshot = React.useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${apiBase}/snapshot`);
      if (!response.ok) throw new Error(`API ${response.status}`);
      setSnapshot((await response.json()) as BotSnapshot);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSnapshot();
    const id = window.setInterval(() => void loadSnapshot(), 15_000);
    return () => window.clearInterval(id);
  }, [loadSnapshot]);

  async function refreshNow() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/refresh`, { method: "POST" });
      if (!response.ok) throw new Error(`API ${response.status}`);
      setSnapshot((await response.json()) as BotSnapshot);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "unknown error");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  const candidates = snapshot?.scores.filter((score) => score.action === "candidate").length ?? 0;
  const skipped = snapshot?.scores.filter((score) => score.action === "skip").length ?? 0;
  const sortedScores = [...(snapshot?.scores ?? [])].sort((left, right) => right.score - left.score);
  const topCandidate = sortedScores.find((score) => score.action === "candidate") ?? sortedScores[0];
  const topMarket = topCandidate ? snapshot?.markets.find((market) => market.address === topCandidate.marketAddress) : undefined;
  const topOutcome = topMarket?.outcomes[0];

  async function planTopCandidate() {
    if (!topMarket || !topOutcome) return;
    setPlanning(true);
    setPlanError(null);
    try {
      const params = new URLSearchParams({
        marketAddress: topMarket.address,
        tokenId: topOutcome.tokenId,
        amountUsdt: String(Math.min(snapshot?.config.maxTradeUsdt ?? 1, 3)),
        slippageBps: "500",
        reason: "dashboard top candidate dry-run"
      });
      const response = await fetch(`${apiBase}/execution/plan?${params.toString()}`);
      if (!response.ok) throw new Error(`API ${response.status}`);
      setExecutionPlan((await response.json()) as ExecutionPlan);
    } catch (currentError) {
      setPlanError(currentError instanceof Error ? currentError.message : "unknown error");
    } finally {
      setPlanning(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">42bot Phase 1</p>
          <h1>Event Token Monitor</h1>
        </div>
        <div className="actions">
          <button type="button" className="iconButton" onClick={refreshNow} disabled={refreshing} title="Refresh snapshot">
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          </button>
          <button type="button" className="iconButton" onClick={planTopCandidate} disabled={planning || !topMarket || !topOutcome} title="Build dry-run execution plan">
            <TerminalSquare size={18} />
          </button>
        </div>
      </header>

      {error ? <div className="notice danger">API error: {error}</div> : null}
      {planError ? <div className="notice danger">Execution plan error: {planError}</div> : null}
      {loading ? <div className="notice">Loading 42space REST snapshot...</div> : null}

      <section className="metrics">
        <Metric icon={<Radio size={18} />} label="Bot Health" value={snapshot?.status.health ?? "unknown"} tone={snapshot?.status.health === "ok" ? "good" : "warn"} />
        <Metric icon={<BarChart3 size={18} />} label="Markets" value={String(snapshot?.status.marketsFetched ?? 0)} />
        <Metric icon={<Zap size={18} />} label="Candidates" value={String(candidates)} tone={candidates > 0 ? "hot" : "neutral"} />
        <Metric icon={<Activity size={18} />} label="Activity Rows" value={String(snapshot?.status.activitiesFetched ?? 0)} />
        <Metric icon={<ShieldCheck size={18} />} label="Live Trading" value={snapshot?.config.liveTrading ? "ON" : "OFF"} tone={snapshot?.config.liveTrading ? "warn" : "good"} />
        <Metric icon={<PauseCircle size={18} />} label="Kill Switch" value={snapshot?.config.killSwitch ? "ON" : "OFF"} tone={snapshot?.config.killSwitch ? "good" : "warn"} />
      </section>

      <section className="grid">
        <Panel title="Strategy Scores" subtitle={`候选阈值 ${snapshot?.config.hotMarketMinScore ?? "-"}，跳过 ${skipped}`}>
          <div className="scoreList">
            {sortedScores.slice(0, 12).map((score) => {
              const market = snapshot?.markets.find((item) => item.address === score.marketAddress);
              return (
                <article className="scoreRow" key={score.marketAddress}>
                  <div className="scoreGauge" data-action={score.action}>{score.score}</div>
                  <div className="scoreBody">
                    <div className="rowHead">
                      <strong>{market?.question ?? score.marketAddress}</strong>
                      <span className={`pill ${score.action}`}>{score.action}</span>
                    </div>
                    <div className="subline">
                      {shortAddress(score.marketAddress)} · {score.metrics.mintCount} mint · {score.metrics.uniqueUsers} users · ${formatNumber(score.metrics.volume)}
                    </div>
                    <div className="chips">
                      {score.reasons.slice(0, 3).map((reason) => <span key={reason}>{reason}</span>)}
                      {score.warnings.slice(0, 2).map((warning) => <span className="warnChip" key={warning}>{warning}</span>)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel title="Risk Limits" subtitle="实盘路径仍需要人工确认">
          <div className="riskGrid">
            <Risk label="单笔上限" value={`${snapshot?.config.maxTradeUsdt ?? 0} USDT`} />
            <Risk label="日上限" value={`${snapshot?.config.dailyMaxUsdt ?? 0} USDT`} />
            <Risk label="最大持仓" value={String(snapshot?.config.maxOpenPositions ?? 0)} />
            <Risk label="刷新耗时" value={`${snapshot?.status.durationMs ?? 0} ms`} />
            <Risk label="数据源" value={snapshot?.status.source ?? "rest"} />
            <Risk label="更新时间" value={snapshot ? formatTime(snapshot.updatedAt) : "-"} />
          </div>
          <div className="notice compact">
            当前按钮只生成 dry-run/preflight 计划，不签名、不授权、不发交易。真实广播会在单独阶段加入双确认。
          </div>
        </Panel>
      </section>

      <section className="executionBand">
        <div className="sectionTitle">
          <h2>Execution Dry Run</h2>
          <span>quote + risk + gas + tx plan</span>
        </div>
        <div className="executionGrid">
          <div className="panel">
            <div className="riskGrid">
              <Risk label="Risk" value={executionPlan?.risk.allowed ? "allowed" : "blocked"} />
              <Risk label="Readiness" value={executionPlan?.readiness.ready ? "ready" : "blocked"} />
              <Risk label="Quote" value={executionPlan?.quoteCheck.status ?? "-"} />
              <Risk label="Gas" value={executionPlan?.gas.gasPriceGwei ? `${Number(executionPlan.gas.gasPriceGwei).toFixed(3)} gwei` : executionPlan?.gas.status ?? "-"} />
              <Risk label="Preconditions" value={executionPlan?.preconditionsReady ? "ready" : "not ready"} />
              <Risk label="Broadcast" value={executionPlan?.broadcastReady ? "ready" : "blocked"} />
            </div>
          </div>
          <div className="panel">
            <div className="txList">
              {(executionPlan?.transactions ?? []).map((tx, index) => (
                <div className="txRow" key={`${tx.kind}-${index}`}>
                  <div>
                    <strong>{tx.kind}</strong>
                    <span>{tx.description}</span>
                    <span>{shortAddress(tx.to)} · call {tx.preflight.call.status} · gas {tx.preflight.gas.status}</span>
                  </div>
                  <span className={`pill ${tx.required ? "candidate" : "watch"}`}>{tx.required ? "required" : "skip"}</span>
                </div>
              ))}
              {!executionPlan ? <div className="notice compact">点击右上角终端图标，为当前最高分市场生成执行前计划。</div> : null}
            </div>
          </div>
          <div className="panel blockers">
            {(executionPlan?.blockedReasons ?? ["尚未生成执行计划"]).slice(0, 8).map((reason) => (
              <div className="blocker" key={reason}>{reason}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketBand">
        <div className="sectionTitle">
          <h2>Observed Markets</h2>
          <span>REST market + activity + price snapshots</span>
        </div>
        <div className="marketGrid">
          {(snapshot?.observations ?? []).map((market) => (
            <article className="marketCard" key={market.marketAddress}>
              <div className="rowHead">
                <strong>{market.question}</strong>
                <span className="pill watch">{market.status}</span>
              </div>
              <div className="subline">
                {shortAddress(market.marketAddress)} · {market.traders} traders · ${formatNumber(market.volume)}
              </div>
              <div className="outcomes">
                {market.outcomes.slice(0, 6).map((outcome) => (
                  <div className="outcome" key={outcome.tokenId}>
                    <span>{outcome.name}</span>
                    <strong>{formatNumber(outcome.price)}</strong>
                  </div>
                ))}
              </div>
              <div className="activityList">
                {market.recentActivity.slice(0, 4).map((activity, index) => (
                  <div className="activityItem" key={`${activity.transactionHash ?? activity.timestamp}-${activity.type}-${index}`}>
                    <span>{activity.type}</span>
                    <span>{activity.collateral ? `$${formatNumber(activity.collateral)}` : shortAddress(activity.userAddress ?? "")}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <AlertTriangle size={16} />
        当前阶段不签名、不授权、不发交易；官方合约 ABI 和最新市场 trace 验证通过后才进入小额实盘阶段。
      </footer>
    </main>
  );
}

function Metric(props: { icon: React.ReactNode; label: string; value: string; tone?: "good" | "warn" | "hot" | "neutral" }) {
  return (
    <div className={`metric ${props.tone ?? "neutral"}`}>
      <div className="metricIcon">{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function Panel(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="sectionTitle">
        <h2>{props.title}</h2>
        <span>{props.subtitle}</span>
      </div>
      {props.children}
    </section>
  );
}

function Risk(props: { label: string; value: string }) {
  return (
    <div className="risk">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function shortAddress(address: string): string {
  if (address.length < 12) return address || "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

createRoot(document.getElementById("root")!).render(<App />);
