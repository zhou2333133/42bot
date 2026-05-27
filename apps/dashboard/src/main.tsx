import React from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  LogOut,
  PauseCircle,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  TerminalSquare,
  Zap
} from "lucide-react";
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
  risk: { allowed: boolean; reasons: string[] };
  readiness: { ready: boolean; reasons: string[] };
  gas: {
    status: "passed" | "failed" | "skipped";
    maxGasGwei: number;
    gasPriceGwei?: string;
    withinCap: boolean;
    reasons: string[];
  };
  quoteCheck: { status: "passed" | "failed" | "skipped"; reason?: string; error?: string };
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

interface JournalSummary {
  updatedAt: string;
  entries: Array<{
    id: string;
    createdAt: string;
    side: "buy" | "sell";
    status: "planned" | "blocked" | "submitted" | "confirmed" | "failed";
    marketAddress: string;
    tokenId: string;
    amountUsdt: number;
    reason: string;
    transactionHashes: string[];
    blockedReasons: string[];
    error?: string;
  }>;
  positions: Array<{
    key: string;
    marketAddress: string;
    tokenId: string;
    buyUsdt: number;
    sellUsdt: number;
    realizedPnlUsdt: number;
    open: boolean;
  }>;
  totals: {
    entries: number;
    submitted: number;
    confirmed: number;
    failed: number;
    blocked: number;
    buyUsdt: number;
    sellUsdt: number;
    realizedPnlUsdt: number;
  };
}

interface RuntimeSettingsView {
  saved: RuntimeSettings;
  effective: Required<RuntimeSettings>;
  updatedAt?: string;
}

interface RuntimeSettings {
  LIVE_TRADING?: boolean;
  KILL_SWITCH?: boolean;
  MAX_TRADE_USDT?: number;
  DAILY_MAX_USDT?: number;
  MAX_OPEN_POSITIONS?: number;
  MAX_SLIPPAGE_BPS?: number;
  MAX_GAS_GWEI?: number;
  REQUIRE_REAL_MINTS?: boolean;
  HOT_MARKET_MIN_SCORE?: number;
  MARKET_LOOKBACK_LIMIT?: number;
  POLL_INTERVAL_MS?: number;
}

interface RuntimeLogSummary {
  updatedAt: string;
  entries: Array<{
    id: string;
    createdAt: string;
    level: "info" | "warn" | "error";
    service: "api" | "bot" | "live-buy" | "system";
    event: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
}

const DEFAULT_API_BASE = `${window.location.protocol}//${window.location.hostname}:4210`;
const STORED_API_BASE_KEY = "42bot.apiBase";
const STORED_API_TOKEN_KEY = "42bot.apiToken";

function authHeaders(token: string, json = false): HeadersInit | undefined {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return Object.keys(headers).length ? headers : undefined;
}

function App() {
  const [apiBase, setApiBase] = React.useState(() => localStorage.getItem(STORED_API_BASE_KEY) ?? DEFAULT_API_BASE);
  const [apiToken, setApiToken] = React.useState(() => localStorage.getItem(STORED_API_TOKEN_KEY) ?? "");
  const [tokenDraft, setTokenDraft] = React.useState("");
  const [apiBaseDraft, setApiBaseDraft] = React.useState(apiBase);
  const [snapshot, setSnapshot] = React.useState<BotSnapshot | null>(null);
  const [settings, setSettings] = React.useState<RuntimeSettingsView | null>(null);
  const [settingsDraft, setSettingsDraft] = React.useState<RuntimeSettings>({});
  const [logs, setLogs] = React.useState<RuntimeLogSummary | null>(null);
  const [journal, setJournal] = React.useState<JournalSummary | null>(null);
  const [executionPlan, setExecutionPlan] = React.useState<ExecutionPlan | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [planning, setPlanning] = React.useState(false);

  const loadAll = React.useCallback(async () => {
    if (!apiToken) return;
    setError(null);
    try {
      const headers = authHeaders(apiToken);
      const [snapshotResponse, journalResponse, settingsResponse, logsResponse] = await Promise.all([
        fetch(`${apiBase}/snapshot`, { headers }),
        fetch(`${apiBase}/journal`, { headers }),
        fetch(`${apiBase}/settings`, { headers }),
        fetch(`${apiBase}/logs?limit=120`, { headers })
      ]);
      if ([snapshotResponse, journalResponse, settingsResponse, logsResponse].some((response) => response.status === 401)) {
        clearLogin();
        throw new Error("认证失败，请重新输入面板登录令牌");
      }
      if (!snapshotResponse.ok) throw new Error(`快照接口 ${snapshotResponse.status}`);
      if (!journalResponse.ok) throw new Error(`账本接口 ${journalResponse.status}`);
      if (!settingsResponse.ok) throw new Error(`设置接口 ${settingsResponse.status}`);
      if (!logsResponse.ok) throw new Error(`日志接口 ${logsResponse.status}`);
      const nextSettings = (await settingsResponse.json()) as RuntimeSettingsView;
      setSnapshot((await snapshotResponse.json()) as BotSnapshot);
      setJournal((await journalResponse.json()) as JournalSummary);
      setSettings(nextSettings);
      setSettingsDraft(nextSettings.effective);
      setLogs((await logsResponse.json()) as RuntimeLogSummary);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "未知错误");
    }
  }, [apiBase, apiToken]);

  React.useEffect(() => {
    if (!apiToken) return;
    void loadAll();
    const id = window.setInterval(() => void loadAll(), 15_000);
    return () => window.clearInterval(id);
  }, [apiToken, loadAll]);

  function saveLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBase = apiBaseDraft.trim().replace(/\/$/, "");
    const nextToken = tokenDraft.trim();
    if (!nextBase || !nextToken) {
      setError("接口地址和登录令牌都不能为空");
      return;
    }
    localStorage.setItem(STORED_API_BASE_KEY, nextBase);
    localStorage.setItem(STORED_API_TOKEN_KEY, nextToken);
    setApiBase(nextBase);
    setApiToken(nextToken);
    setTokenDraft("");
    setError(null);
  }

  function clearLogin() {
    localStorage.removeItem(STORED_API_TOKEN_KEY);
    setApiToken("");
    setSnapshot(null);
    setJournal(null);
    setSettings(null);
    setLogs(null);
    setExecutionPlan(null);
  }

  async function refreshNow() {
    setRefreshing(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/refresh`, { method: "POST", headers: authHeaders(apiToken) });
      if (response.status === 401) {
        clearLogin();
        throw new Error("认证失败，请重新输入面板登录令牌");
      }
      if (!response.ok) throw new Error(`刷新失败 ${response.status}`);
      setSnapshot((await response.json()) as BotSnapshot);
      setMessage("已手动刷新市场快照");
      await loadAll();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "未知错误");
    } finally {
      setRefreshing(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/settings`, {
        method: "PATCH",
        headers: authHeaders(apiToken, true),
        body: JSON.stringify(settingsDraft)
      });
      if (response.status === 401) {
        clearLogin();
        throw new Error("认证失败，请重新输入面板登录令牌");
      }
      if (!response.ok) throw new Error(`保存设置失败 ${response.status}`);
      const next = (await response.json()) as RuntimeSettingsView;
      setSettings(next);
      setSettingsDraft(next.effective);
      setMessage("设置已保存，下一轮轮询会自动生效");
      await loadAll();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "未知错误");
    } finally {
      setSavingSettings(false);
    }
  }

  async function planTopCandidate() {
    const sortedScores = [...(snapshot?.scores ?? [])].sort((left, right) => right.score - left.score);
    const topCandidate = sortedScores.find((score) => score.action === "candidate") ?? sortedScores[0];
    const topMarket = topCandidate ? snapshot?.markets.find((market) => market.address === topCandidate.marketAddress) : undefined;
    const topOutcome = topMarket?.outcomes[0];
    if (!topMarket || !topOutcome) return;
    setPlanning(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        marketAddress: topMarket.address,
        tokenId: topOutcome.tokenId,
        amountUsdt: String(Math.min(settingsDraft.MAX_TRADE_USDT ?? snapshot?.config.maxTradeUsdt ?? 1, 3)),
        slippageBps: String(settingsDraft.MAX_SLIPPAGE_BPS ?? 500),
        reason: "面板最高分市场执行前计划"
      });
      const response = await fetch(`${apiBase}/execution/plan?${params.toString()}`, { headers: authHeaders(apiToken) });
      if (response.status === 401) {
        clearLogin();
        throw new Error("认证失败，请重新输入面板登录令牌");
      }
      if (!response.ok) throw new Error(`执行计划失败 ${response.status}`);
      setExecutionPlan((await response.json()) as ExecutionPlan);
      setMessage("已生成执行计划");
      await loadAll();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "未知错误");
    } finally {
      setPlanning(false);
    }
  }

  if (!apiToken) {
    return (
      <main className="shell authShell">
        <section className="authPanel">
          <p className="eyebrow">42bot 面板</p>
          <h1>登录面板</h1>
          <p className="authCopy">输入 VPS 的接口地址和 `.env` 里的面板登录令牌。浏览器会记住这次登录。</p>
          <form className="authForm" onSubmit={saveLogin}>
            <label>
              <span>接口地址</span>
              <input value={apiBaseDraft} onChange={(event) => setApiBaseDraft(event.target.value)} placeholder={DEFAULT_API_BASE} />
            </label>
            <label>
              <span>登录令牌</span>
              <input value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} type="password" autoComplete="current-password" />
            </label>
            <button type="submit">登录</button>
          </form>
          {error ? <div className="notice danger">{error}</div> : null}
        </section>
      </main>
    );
  }

  const sortedScores = [...(snapshot?.scores ?? [])].sort((left, right) => right.score - left.score);
  const candidates = snapshot?.scores.filter((score) => score.action === "candidate").length ?? 0;
  const skipped = snapshot?.scores.filter((score) => score.action === "skip").length ?? 0;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">42bot 控制台</p>
          <h1>事件代币狙击面板</h1>
          <p className="subline">接口：{apiBase}</p>
        </div>
        <div className="actions">
          <button type="button" className="iconButton" onClick={refreshNow} disabled={refreshing} title="刷新">
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          </button>
          <button type="button" className="iconButton" onClick={planTopCandidate} disabled={planning || sortedScores.length === 0} title="生成执行计划">
            <TerminalSquare size={18} />
          </button>
          <button type="button" className="iconButton" onClick={clearLogin} title="退出登录">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {message ? <div className="notice success">{message}</div> : null}
      {error ? <div className="notice danger">{error}</div> : null}

      <section className="metrics">
        <Metric icon={<ShieldCheck size={18} />} label="机器人状态" value={snapshot?.status.health === "ok" ? "正常" : "异常"} tone={snapshot?.status.health === "ok" ? "good" : "warn"} />
        <Metric icon={<BarChart3 size={18} />} label="市场数量" value={String(snapshot?.status.marketsFetched ?? 0)} />
        <Metric icon={<Zap size={18} />} label="候选市场" value={String(candidates)} tone={candidates > 0 ? "hot" : "neutral"} />
        <Metric icon={<Activity size={18} />} label="链上活动" value={String(snapshot?.status.activitiesFetched ?? 0)} />
        <Metric icon={<PauseCircle size={18} />} label="熔断开关" value={settingsDraft.KILL_SWITCH ? "开启" : "关闭"} tone={settingsDraft.KILL_SWITCH ? "good" : "warn"} />
        <Metric icon={<AlertTriangle size={18} />} label="实盘模式" value={settingsDraft.LIVE_TRADING ? "开启" : "关闭"} tone={settingsDraft.LIVE_TRADING ? "warn" : "good"} />
      </section>

      <section className="workspace">
        <div className="mainColumn">
          <Panel icon={<Settings size={18} />} title="运行设置" subtitle={settings?.updatedAt ? `上次保存 ${formatTime(settings.updatedAt)}` : "修改后下一轮轮询生效"}>
            <SettingsEditor draft={settingsDraft} onChange={setSettingsDraft} onSave={saveSettings} saving={savingSettings} />
          </Panel>

          <Panel icon={<Zap size={18} />} title="策略评分" subtitle={`候选 ${candidates}，跳过 ${skipped}`}>
            <div className="scoreList">
              {sortedScores.slice(0, 12).map((score) => {
                const market = snapshot?.markets.find((item) => item.address === score.marketAddress);
                return <ScoreRow key={score.marketAddress} score={score} market={market} />;
              })}
              {sortedScores.length === 0 ? <div className="empty">暂无评分数据，等待下一轮轮询。</div> : null}
            </div>
          </Panel>

          <Panel icon={<TerminalSquare size={18} />} title="执行计划" subtitle="只生成计划，不在面板发真实交易">
            <ExecutionPlanView plan={executionPlan} />
          </Panel>
        </div>

        <div className="sideColumn">
          <Panel icon={<FileText size={18} />} title="运行日志" subtitle="机器人正在做什么">
            <LogList logs={logs} />
          </Panel>

          <Panel icon={<BarChart3 size={18} />} title="交易账本" subtitle="计划、阻断、提交和盈亏">
            <JournalView journal={journal} />
          </Panel>
        </div>
      </section>

      <Panel icon={<Activity size={18} />} title="观察市场" subtitle="市场、价格和近期链上活动">
        <MarketGrid observations={snapshot?.observations ?? []} />
      </Panel>

      <footer>
        <AlertTriangle size={16} />
        面板不保存私钥，不提供真实交易按钮；真实买入仍通过 VPS 命令行执行。
      </footer>
    </main>
  );
}

function SettingsEditor(props: {
  draft: RuntimeSettings;
  onChange: (value: RuntimeSettings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const update = (patch: RuntimeSettings) => props.onChange({ ...props.draft, ...patch });
  return (
    <div className="settingsGrid">
      <Toggle label="实盘模式" value={Boolean(props.draft.LIVE_TRADING)} onChange={(value) => update({ LIVE_TRADING: value })} />
      <Toggle label="熔断开关" value={Boolean(props.draft.KILL_SWITCH)} onChange={(value) => update({ KILL_SWITCH: value })} />
      <Toggle label="要求真实买入记录" value={Boolean(props.draft.REQUIRE_REAL_MINTS)} onChange={(value) => update({ REQUIRE_REAL_MINTS: value })} />
      <NumberField label="单笔上限 USDT" value={props.draft.MAX_TRADE_USDT} min={0.1} step={0.1} onChange={(value) => update({ MAX_TRADE_USDT: value })} />
      <NumberField label="日上限 USDT" value={props.draft.DAILY_MAX_USDT} min={0.1} step={0.1} onChange={(value) => update({ DAILY_MAX_USDT: value })} />
      <NumberField label="最大持仓数" value={props.draft.MAX_OPEN_POSITIONS} min={0} step={1} onChange={(value) => update({ MAX_OPEN_POSITIONS: value })} />
      <NumberField label="最大滑点基点" value={props.draft.MAX_SLIPPAGE_BPS} min={0} step={50} onChange={(value) => update({ MAX_SLIPPAGE_BPS: value })} />
      <NumberField label="最大燃料费 gwei" value={props.draft.MAX_GAS_GWEI} min={0.1} step={0.1} onChange={(value) => update({ MAX_GAS_GWEI: value })} />
      <NumberField label="候选分数阈值" value={props.draft.HOT_MARKET_MIN_SCORE} min={0} max={100} step={1} onChange={(value) => update({ HOT_MARKET_MIN_SCORE: value })} />
      <NumberField label="市场回看数量" value={props.draft.MARKET_LOOKBACK_LIMIT} min={1} max={200} step={1} onChange={(value) => update({ MARKET_LOOKBACK_LIMIT: value })} />
      <NumberField label="轮询间隔毫秒" value={props.draft.POLL_INTERVAL_MS} min={1000} step={1000} onChange={(value) => update({ POLL_INTERVAL_MS: value })} />
      <button type="button" className="saveButton" onClick={props.onSave} disabled={props.saving}>
        <Save size={16} />
        {props.saving ? "保存中" : "保存设置"}
      </button>
    </div>
  );
}

function Toggle(props: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="toggleRow">
      <span>{props.label}</span>
      <input type="checkbox" checked={props.value} onChange={(event) => props.onChange(event.target.checked)} />
    </label>
  );
}

function NumberField(props: {
  label: string;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="fieldRow">
      <span>{props.label}</span>
      <input
        type="number"
        value={props.value ?? 0}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ScoreRow(props: { score: MarketScore; market?: Market }) {
  return (
    <article className="scoreRow">
      <div className="scoreGauge" data-action={props.score.action}>{props.score.score}</div>
      <div className="scoreBody">
        <div className="rowHead">
          <strong>{props.market?.question ?? props.score.marketAddress}</strong>
          <span className={`pill ${props.score.action}`}>{translateAction(props.score.action)}</span>
        </div>
        <div className="subline">
          {shortAddress(props.score.marketAddress)} · {props.score.metrics.mintCount} 次买入 · {props.score.metrics.uniqueUsers} 用户 · {formatNumber(props.score.metrics.volume)} USDT
        </div>
        <div className="chips">
          {props.score.reasons.slice(0, 3).map((reason) => <span key={reason}>{translateReason(reason)}</span>)}
          {props.score.warnings.slice(0, 2).map((warning) => <span className="warnChip" key={warning}>{translateReason(warning)}</span>)}
        </div>
      </div>
    </article>
  );
}

function ExecutionPlanView(props: { plan: ExecutionPlan | null }) {
  if (!props.plan) return <div className="empty">点击右上角终端图标，为当前最高分市场生成执行前计划。</div>;
  const plan = props.plan;
  return (
    <div className="executionGrid">
      <div className="riskGrid">
        <Risk label="风控" value={plan.risk.allowed ? "允许" : "阻断"} />
        <Risk label="就绪" value={plan.readiness.ready ? "就绪" : "阻断"} />
        <Risk label="预估报价" value={translateStatus(plan.quoteCheck.status)} />
        <Risk label="燃料费" value={plan.gas.gasPriceGwei ? `${Number(plan.gas.gasPriceGwei).toFixed(3)} gwei` : translateStatus(plan.gas.status)} />
        <Risk label="预演" value={plan.preconditionsReady ? "通过" : "未通过"} />
        <Risk label="广播" value={plan.broadcastReady ? "就绪" : "阻断"} />
      </div>
      <div className="txList">
        {plan.transactions.map((tx, index) => (
          <div className="txRow" key={`${tx.kind}-${index}`}>
            <div>
              <strong>{translateTxKind(tx.kind)}</strong>
              <span>{translateTxDescription(tx.description)}</span>
              <span>{shortAddress(tx.to)} · 调用 {translateStatus(tx.preflight.call.status)} · 燃料 {translateStatus(tx.preflight.gas.status)}</span>
            </div>
            <span className={`pill ${tx.required ? "candidate" : "watch"}`}>{tx.required ? "需要" : "跳过"}</span>
          </div>
        ))}
      </div>
      <div className="blockers">
        {(plan.blockedReasons.length ? plan.blockedReasons : ["没有阻断原因"]).slice(0, 8).map((reason) => (
          <div className={plan.blockedReasons.length ? "blocker" : "okLine"} key={reason}>{translateReason(reason)}</div>
        ))}
      </div>
    </div>
  );
}

function LogList(props: { logs: RuntimeLogSummary | null }) {
  const entries = [...(props.logs?.entries ?? [])].reverse().slice(0, 80);
  if (entries.length === 0) return <div className="empty">暂无运行日志。</div>;
  return (
    <div className="logList">
      {entries.map((entry) => (
        <div className={`logRow ${entry.level}`} key={entry.id}>
          <span>{formatTime(entry.createdAt)}</span>
          <strong>{translateService(entry.service)} · {translateLogEvent(entry.event)}</strong>
          <p>{entry.message}</p>
          {formatLogDetails(entry.details) ? <small>{formatLogDetails(entry.details)}</small> : null}
        </div>
      ))}
    </div>
  );
}

function JournalView(props: { journal: JournalSummary | null }) {
  return (
    <div className="journalStack">
      <div className="riskGrid">
        <Risk label="记录数" value={String(props.journal?.totals.entries ?? 0)} />
        <Risk label="已确认" value={String(props.journal?.totals.confirmed ?? 0)} />
        <Risk label="失败" value={String(props.journal?.totals.failed ?? 0)} />
        <Risk label="阻断" value={String(props.journal?.totals.blocked ?? 0)} />
        <Risk label="买入" value={`${formatNumber(props.journal?.totals.buyUsdt ?? 0)} USDT`} />
        <Risk label="已实现盈亏" value={`${formatNumber(props.journal?.totals.realizedPnlUsdt ?? 0)} USDT`} />
      </div>
      <div className="txList">
        {(props.journal?.entries ?? []).slice(-8).reverse().map((entry) => (
          <div className="txRow" key={entry.id}>
            <div>
              <strong>{translateSide(entry.side)} · {translateJournalStatus(entry.status)}</strong>
              <span>{shortAddress(entry.marketAddress)} · 结果编号 {entry.tokenId} · {formatNumber(entry.amountUsdt)} USDT</span>
              <span>{entry.reason}</span>
            </div>
            <span className={`pill ${entry.status === "confirmed" || entry.status === "submitted" ? "candidate" : "watch"}`}>{translateJournalStatus(entry.status)}</span>
          </div>
        ))}
        {props.journal?.entries.length === 0 ? <div className="empty">还没有交易账本记录。</div> : null}
      </div>
    </div>
  );
}

function MarketGrid(props: { observations: MarketObservation[] }) {
  if (props.observations.length === 0) return <div className="empty">暂无观察市场。</div>;
  return (
    <div className="marketGrid">
      {props.observations.map((market) => (
        <article className="marketCard" key={market.marketAddress}>
          <div className="rowHead">
            <strong>{market.question}</strong>
            <span className="pill watch">{translateMarketStatus(market.status)}</span>
          </div>
          <div className="subline">{shortAddress(market.marketAddress)} · {market.traders} 交易者 · {formatNumber(market.volume)} USDT</div>
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
                <span>{translateActivityType(activity.type)}</span>
                <span>{activity.collateral ? `${formatNumber(activity.collateral)} USDT` : shortAddress(activity.userAddress ?? "")}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
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

function Panel(props: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="sectionTitle">
        <div>
          <h2>{props.icon}{props.title}</h2>
          <span>{props.subtitle}</span>
        </div>
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
  return new Intl.NumberFormat("zh-HK", { maximumFractionDigits: 2 }).format(value);
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

function translateAction(value: MarketScore["action"]): string {
  if (value === "candidate") return "候选";
  if (value === "skip") return "跳过";
  return "观察";
}

function translateStatus(value: string): string {
  if (value === "passed") return "通过";
  if (value === "failed") return "失败";
  if (value === "skipped") return "跳过";
  return value;
}

function translateTxKind(value: string): string {
  if (value === "approve") return "授权";
  if (value === "operator") return "操作员授权";
  if (value === "swap") return "交易";
  return value;
}

function translateTxDescription(value: string): string {
  if (value.startsWith("Approve exact BUSDT amount")) return "精确授权本次 BUSDT 给路由合约";
  if (value.startsWith("Set outcome token operator")) return "设置结果代币操作员授权";
  if (value.startsWith("Buy outcome")) return "买入指定结果代币";
  if (value.startsWith("Sell outcome")) return "卖出指定结果代币";
  return translateReason(value);
}

function translateSide(value: string): string {
  return value === "sell" ? "卖出" : "买入";
}

function translateJournalStatus(value: string): string {
  const map: Record<string, string> = {
    planned: "已计划",
    blocked: "已阻断",
    submitted: "已提交",
    confirmed: "已确认",
    failed: "失败"
  };
  return map[value] ?? value;
}

function translateMarketStatus(value: string): string {
  const map: Record<string, string> = {
    not_started: "未开始",
    live: "交易中",
    ended: "已结束",
    resolved: "已出结果",
    finalised: "已完成结算",
    all: "全部"
  };
  return map[value] ?? value;
}

function translateActivityType(value: string): string {
  const map: Record<string, string> = {
    MINT: "买入",
    REDEEM: "卖出",
    FINALISE: "结算",
    CLAIM: "领取"
  };
  return map[value] ?? value;
}

function translateReason(value: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/LIVE_TRADING 未开启/g, "实盘模式未开启"],
    [/市场处于 live 状态/g, "市场处于交易中状态"],
    [/live 状态/g, "交易中状态"],
    [/状态为 finalised/g, "状态为已完成结算"],
    [/状态为 resolved/g, "状态为已出结果"],
    [/状态为 ended/g, "状态为已结束"],
    [/状态为 not_started/g, "状态为未开始"],
    [/状态为 live/g, "状态为交易中"],
    [/BSC_HTTP_RPC 未配置/g, "BNB 链接口未配置"],
    [/WALLET_ADDRESS 未配置或格式错误/g, "钱包地址未配置或格式错误"],
    [/PRIVATE_KEY 未配置/g, "私钥未配置"],
    [/kill switch 已启用/g, "熔断开关已启用"],
    [/dry-run\/preflight preconditions 未全部通过/g, "执行前预演条件未全部通过"],
    [/execution plan preconditionsReady=false/g, "执行计划预演未通过"],
    [/execution plan broadcastReady=false/g, "执行计划未达到广播条件"],
    [/protocol gate liveReady=false/g, "协议核验未达到实盘条件"],
    [/risk engine blocked the trade/g, "风控引擎已阻断本次交易"],
    [/execution readiness blocked the trade/g, "执行就绪检查已阻断本次交易"],
    [/gas price exceeds cap or was not checked/g, "燃料费超过上限或尚未检查"],
    [/quote check did not pass/g, "报价检查未通过"],
    [/balance check failed/g, "余额检查失败"],
    [/no transactions in execution plan/g, "执行计划里没有可执行交易"],
    [/required transaction eth_call did not pass/g, "必要交易调用预演未通过"],
    [/required transaction gas estimate did not pass/g, "必要交易燃料估算未通过"],
    [/quote failed:/g, "报价失败："],
    [/gas price check failed:/g, "燃料费检查失败："],
    [/gas price/g, "燃料费"],
    [/gwei 超过上限/g, "gwei 超过上限"],
    [/chain preflight disabled by caller/g, "调用方关闭了链上预演"],
    [/wallet\/RPC missing/g, "钱包或链接口缺失"],
    [/preconditions not met/g, "前置条件未满足"],
    [/quote unavailable/g, "报价不可用"],
    [/quote side mismatch/g, "报价方向不匹配"],
    [/not checked yet/g, "尚未检查"],
    [/not required/g, "不需要"],
    [/invalid marketAddress/g, "市场地址无效"],
    [/发现真实 MINT/g, "发现真实买入"],
    [/尚无真实 MINT/g, "尚无真实买入记录"],
    [/REDEEM 多于 MINT/g, "卖出多于买入"],
    [/flagged/g, "标记异常"],
    [/oracle/g, "预言机"],
    [/creator/g, "创建者"],
    [/unknown/g, "未知错误"]
  ];
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function translateService(value: string): string {
  const map: Record<string, string> = {
    api: "接口服务",
    bot: "机器人",
    "live-buy": "实盘命令",
    system: "系统"
  };
  return map[value] ?? value;
}

function translateLogEvent(value: string): string {
  const map: Record<string, string> = {
    starting: "启动",
    stopped: "停止",
    poll_started: "开始轮询",
    poll_failed: "轮询失败",
    snapshot_written: "快照已写入",
    manual_refresh: "手动刷新",
    settings_updated: "设置已更新",
    execution_plan: "执行计划",
    plan_only_journaled: "计划已入账",
    execution_finished: "执行结束"
  };
  return map[value] ?? value;
}

function formatLogDetails(details?: Record<string, unknown>): string {
  if (!details) return "";
  const pairs: Array<[string, unknown]> = [
    ["市场", details.markets],
    ["评分", details.scores],
    ["候选", details.candidates],
    ["耗时", typeof details.durationMs === "number" ? `${details.durationMs} 毫秒` : undefined],
    ["回看", details.lookback],
    ["阈值", details.minScore],
    ["金额", typeof details.amountUsdt === "number" ? `${details.amountUsdt} USDT` : undefined],
    ["滑点", details.slippageBps],
    ["已就绪", typeof details.broadcastReady === "boolean" ? (details.broadcastReady ? "是" : "否") : undefined]
  ];
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `${label}：${String(value)}`)
    .join(" · ");
}

declare global {
  interface Window {
    __root42bot?: Root;
  }
}

const rootElement = document.getElementById("root")!;
window.__root42bot ??= createRoot(rootElement);
window.__root42bot.render(<App />);
