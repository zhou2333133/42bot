import {
  createPublicClient,
  formatUnits,
  http,
  isAddress,
  type Address,
  type PublicClient
} from "viem";
import { bsc } from "viem/chains";
import type { AppConfig } from "./config.js";
import { erc20Abi, erc6909Abi } from "./abis.js";
import { usdtToUnits } from "./amounts.js";
import { BUSDT_ADDRESS, CONTRACT_CANDIDATES } from "./constants.js";
import { evaluateExecutionReadiness } from "./execution-gate.js";
import { loadProtocolGate } from "./protocol-gate.js";
import { quoteMintExactUsdt, quoteRedeemExactOt } from "./quoter.js";
import { evaluateRisk } from "./risk.js";
import {
  buildApproveBusdtTransaction,
  buildBuySwapTransaction,
  buildSellSwapTransaction,
  buildSetOutcomeOperatorTransaction
} from "./tx-builder.js";
import type {
  ExecutionCheck,
  ExecutionPlan,
  GasReadiness,
  PreparedExecutionTransaction,
  PreparedTransaction,
  RiskState,
  TradeIntent,
  TradeSide,
  TransactionKind
} from "./types.js";

export interface BuildExecutionPlanOptions {
  config: AppConfig;
  intent: TradeIntent;
  side?: TradeSide;
  riskState?: RiskState;
  publicClient?: PublicClient;
  skipChainPreflight?: boolean;
}

export async function buildExecutionPlan(options: BuildExecutionPlanOptions): Promise<ExecutionPlan> {
  const side = options.side ?? "buy";
  const protocolGate = await loadProtocolGate(options.config.PROTOCOL_REPORT_JSON_PATH);
  const risk = evaluateRisk(options.intent, configToRiskLimits(options.config), options.riskState ?? emptyRiskState());
  const readiness = evaluateExecutionReadiness(options.config, protocolGate, risk);
  const client = options.publicClient ?? (options.config.BSC_HTTP_RPC ? createBscClient(options.config.BSC_HTTP_RPC) : undefined);
  const checks: ExecutionCheck[] = [];
  const transactions: PreparedExecutionTransaction[] = [];
  const blockedReasons = new Set<string>([...risk.reasons, ...readiness.reasons]);

  let gas = emptyGasReadiness(options.config.MAX_GAS_GWEI, "BSC_HTTP_RPC 未配置，跳过 gas price 检查");
  if (client) {
    gas = await checkGasPrice(client, options.config.MAX_GAS_GWEI);
    if (!gas.withinCap) {
      gas.reasons.forEach((reason) => blockedReasons.add(reason));
    }
  } else {
    blockedReasons.add("BSC_HTTP_RPC 未配置，无法 quote/preflight");
  }

  let quoteCheck: ExecutionCheck = { status: "skipped", reason: "preconditions not met" };
  let quote: ExecutionPlan["quote"];

  if (!isAddress(options.intent.marketAddress)) {
    quoteCheck = { status: "failed", reason: "marketAddress 不是有效 EVM 地址" };
    blockedReasons.add(quoteCheck.reason ?? "invalid marketAddress");
  } else if (!client) {
    quoteCheck = { status: "skipped", reason: "BSC_HTTP_RPC 未配置" };
  } else {
    try {
      quote =
        side === "buy"
          ? await quoteMintExactUsdt({
              market: options.intent.marketAddress,
              tokenId: BigInt(options.intent.tokenId),
              amountUsdt: options.intent.amountUsdt,
              slippageBps: options.intent.slippageBps,
              options: {
                rpcUrl: options.config.BSC_HTTP_RPC,
                publicClient: client,
                integratorFeeBps: options.config.INTEGRATOR_FEE_BPS
              }
            })
          : await quoteRedeemExactOt({
              market: options.intent.marketAddress,
              tokenId: BigInt(options.intent.tokenId),
              otAmount: usdtToUnits(options.intent.amountUsdt),
              slippageBps: options.intent.slippageBps,
              options: {
                rpcUrl: options.config.BSC_HTTP_RPC,
                publicClient: client,
                integratorFeeBps: options.config.INTEGRATOR_FEE_BPS
              }
            });
      quoteCheck = { status: "passed" };
    } catch (error) {
      quoteCheck = { status: "failed", error: errorMessage(error) };
      blockedReasons.add(`quote failed: ${quoteCheck.error}`);
    }
  }

  if (quote && isAddress(options.config.WALLET_ADDRESS)) {
    const owner = options.config.WALLET_ADDRESS;
    if (side === "buy" && quote.side === "buy") {
      transactions.push(
        asExecutionTransaction({
          kind: "approve",
          required: await needsBusdtApproval(client, owner, quote.amountIn),
          tx: buildApproveBusdtTransaction({ amount: quote.amountIn })
        })
      );
      transactions.push(
        asExecutionTransaction({
          kind: "swap",
          required: true,
          tx: buildBuySwapTransaction({
            market: quote.market as Address,
            receiver: owner,
            quote,
            integrator: normalizeOptionalAddress(options.config.INTEGRATOR_ADDRESS)
          })
        })
      );
    }

    if (side === "sell" && quote.side === "sell") {
      transactions.push(
        asExecutionTransaction({
          kind: "operator",
          required: await needsOutcomeOperator(client, quote.market as Address, owner),
          tx: buildSetOutcomeOperatorTransaction({ market: quote.market as Address, approved: true })
        })
      );
      transactions.push(
        asExecutionTransaction({
          kind: "swap",
          required: true,
          tx: buildSellSwapTransaction({
            market: quote.market as Address,
            receiver: owner,
            quote,
            integrator: normalizeOptionalAddress(options.config.INTEGRATOR_ADDRESS)
          })
        })
      );
    }
  } else if (quote && !isAddress(options.config.WALLET_ADDRESS)) {
    blockedReasons.add("WALLET_ADDRESS 未配置或格式错误，无法构造 receiver");
  }

  const balanceChecks = await buildBalanceChecks({
    client,
    side,
    intent: options.intent,
    owner: options.config.WALLET_ADDRESS,
    quote
  });
  for (const check of balanceChecks) {
    checks.push(check);
    if (check.status === "failed") {
      blockedReasons.add(check.reason ?? check.error ?? "balance check failed");
    }
  }

  if (client && isAddress(options.config.WALLET_ADDRESS) && !options.skipChainPreflight) {
    await preflightTransactions(client, options.config.WALLET_ADDRESS, transactions, gas, blockedReasons);
  } else {
    for (const tx of transactions) {
      tx.preflight.call = {
        status: "skipped",
        reason: options.skipChainPreflight ? "chain preflight disabled by caller" : "wallet/RPC missing"
      };
      tx.preflight.gas = tx.preflight.call;
    }
  }

  const preconditionsReady =
    readiness.ready &&
    gas.withinCap &&
    quoteCheck.status === "passed" &&
    balanceChecks.every((check) => check.status !== "failed") &&
    transactions.filter((tx) => tx.required).every((tx) => tx.preflight.call.status === "passed" && tx.preflight.gas.status === "passed");

  return {
    createdAt: new Date().toISOString(),
    side,
    intent: options.intent,
    protocolGate,
    risk,
    readiness,
    gas,
    quote,
    quoteCheck,
    balanceChecks,
    transactions,
    preconditionsReady,
    broadcastImplemented: false,
    broadcastReady: false,
    blockedReasons: [
      ...blockedReasons,
      "Phase 4 只生成 dry-run/preflight 执行计划；签名和广播模块尚未实现"
    ]
  };
}

function configToRiskLimits(config: AppConfig) {
  return {
    liveTrading: config.LIVE_TRADING,
    maxTradeUsdt: config.MAX_TRADE_USDT,
    dailyMaxUsdt: config.DAILY_MAX_USDT,
    maxOpenPositions: config.MAX_OPEN_POSITIONS,
    maxSlippageBps: config.MAX_SLIPPAGE_BPS,
    killSwitch: config.KILL_SWITCH
  };
}

function emptyRiskState(): RiskState {
  return {
    spentTodayUsdt: 0,
    openPositions: 0,
    consecutiveFailures: 0
  };
}

function createBscClient(rpcUrl: string): PublicClient {
  return createPublicClient({ chain: bsc, transport: http(rpcUrl) });
}

async function checkGasPrice(client: PublicClient, maxGasGwei: number): Promise<GasReadiness> {
  try {
    const gasPrice = await client.getGasPrice();
    const gasPriceGwei = formatUnits(gasPrice, 9);
    const maxGasWei = usdtToUnits(maxGasGwei, 9);
    const withinCap = gasPrice <= maxGasWei;
    return {
      status: withinCap ? "passed" : "failed",
      maxGasGwei,
      gasPriceWei: gasPrice.toString(),
      gasPriceGwei,
      withinCap,
      reasons: withinCap ? [] : [`gas price ${gasPriceGwei} gwei 超过上限 ${maxGasGwei} gwei`]
    };
  } catch (error) {
    return {
      status: "failed",
      maxGasGwei,
      withinCap: false,
      reasons: [`gas price check failed: ${errorMessage(error)}`]
    };
  }
}

function emptyGasReadiness(maxGasGwei: number, reason: string): GasReadiness {
  return {
    status: "skipped",
    maxGasGwei,
    withinCap: false,
    reasons: [reason]
  };
}

async function needsBusdtApproval(client: PublicClient | undefined, owner: Address, amount: bigint): Promise<boolean> {
  if (!client) return true;
  try {
    const allowance = await client.readContract({
      address: BUSDT_ADDRESS,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, CONTRACT_CANDIDATES.routerProxy]
    });
    return allowance < amount;
  } catch {
    return true;
  }
}

async function needsOutcomeOperator(client: PublicClient | undefined, market: Address, owner: Address): Promise<boolean> {
  if (!client) return true;
  try {
    const isOperator = await client.readContract({
      address: market,
      abi: erc6909Abi,
      functionName: "isOperator",
      args: [owner, CONTRACT_CANDIDATES.routerProxy]
    });
    return !isOperator;
  } catch {
    return true;
  }
}

function asExecutionTransaction(params: {
  kind: TransactionKind;
  required: boolean;
  tx: PreparedTransaction;
}): PreparedExecutionTransaction {
  return {
    ...params.tx,
    kind: params.kind,
    required: params.required,
    preflight: {
      call: { status: params.required ? "skipped" : "passed", reason: params.required ? "not checked yet" : "not required" },
      gas: { status: params.required ? "skipped" : "passed", reason: params.required ? "not checked yet" : "not required" }
    }
  };
}

async function buildBalanceChecks(params: {
  client: PublicClient | undefined;
  side: TradeSide;
  intent: TradeIntent;
  owner: string;
  quote?: ExecutionPlan["quote"];
}): Promise<ExecutionCheck[]> {
  if (!params.quote) return [{ status: "skipped", reason: "quote unavailable" }];
  if (!params.client) return [{ status: "skipped", reason: "BSC_HTTP_RPC 未配置" }];
  if (!isAddress(params.owner)) return [{ status: "skipped", reason: "WALLET_ADDRESS 未配置或格式错误" }];

  try {
    if (params.side === "buy" && params.quote.side === "buy") {
      const balance = await params.client.readContract({
        address: BUSDT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [params.owner]
      });
      return balance >= params.quote.amountIn
        ? [{ status: "passed" }]
        : [{ status: "failed", reason: `BUSDT 余额不足: need ${params.quote.amountIn.toString()}, have ${balance.toString()}` }];
    }

    if (params.side === "sell" && params.quote.side === "sell") {
      const balance = await params.client.readContract({
        address: params.intent.marketAddress as Address,
        abi: erc6909Abi,
        functionName: "balanceOf",
        args: [params.owner, BigInt(params.intent.tokenId)]
      });
      return balance >= params.quote.amountIn
        ? [{ status: "passed" }]
        : [{ status: "failed", reason: `Outcome token 余额不足: need ${params.quote.amountIn.toString()}, have ${balance.toString()}` }];
    }

    return [{ status: "skipped", reason: "quote side mismatch" }];
  } catch (error) {
    return [{ status: "failed", error: errorMessage(error) }];
  }
}

async function preflightTransactions(
  client: PublicClient,
  account: Address,
  transactions: PreparedExecutionTransaction[],
  gas: GasReadiness,
  blockedReasons: Set<string>
): Promise<void> {
  for (const tx of transactions) {
    if (!tx.required) continue;

    try {
      await client.call({
        account,
        to: tx.to as Address,
        data: tx.data,
        value: tx.value
      });
      tx.preflight.call = { status: "passed" };
    } catch (error) {
      tx.preflight.call = { status: "failed", error: errorMessage(error) };
      blockedReasons.add(`${tx.kind} eth_call failed: ${tx.preflight.call.error}`);
      continue;
    }

    try {
      const gasUnits = await client.estimateGas({
        account,
        to: tx.to as Address,
        data: tx.data,
        value: tx.value
      });
      tx.preflight.gas = { status: "passed" };
      tx.preflight.gasUnits = gasUnits.toString();
      if (gas.gasPriceWei) {
        tx.preflight.gasCostWei = (gasUnits * BigInt(gas.gasPriceWei)).toString();
      }
    } catch (error) {
      tx.preflight.gas = { status: "failed", error: errorMessage(error) };
      blockedReasons.add(`${tx.kind} gas estimate failed: ${tx.preflight.gas.error}`);
    }
  }
}

function normalizeOptionalAddress(address: string): Address | undefined {
  return address && isAddress(address) ? address : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
