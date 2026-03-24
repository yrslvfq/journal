/** Prop-firm style risk: distance to rule breach (USD). */

export type PropAccountInput = {
  startingBalance: number;
  maxDailyLossPercent: number;
  maxDailyLossUsd: number | null;
  maxTrailingDrawdownPercent: number;
  peakBalance: number;
};

export type PropMetricsInput = PropAccountInput & {
  /** Equity now = startingBalance + cumulative net P&L */
  currentBalance: number;
  /** Net P&L for the selected calendar day (can be negative). */
  todayNetPnl: number;
};

export type DistanceToLiquidationResult = {
  distanceToLiquidationUsd: number;
  dailyLossUsedUsd: number;
  dailyLossLimitUsd: number;
  dailyUtilization: number;
  trailingDrawdownUsd: number;
  trailingLimitUsd: number;
  trailingUtilization: number;
};

export function dailyLossLimitUsd(cfg: PropAccountInput): number {
  const fromPct = Math.max(0, cfg.startingBalance * (cfg.maxDailyLossPercent / 100));
  if (cfg.maxDailyLossUsd != null && cfg.maxDailyLossUsd > 0) {
    return Math.min(fromPct, cfg.maxDailyLossUsd);
  }
  return fromPct;
}

export function distanceToLiquidation(m: PropMetricsInput): DistanceToLiquidationResult {
  const dailyLimit = dailyLossLimitUsd(m);
  const todayLossUsd = Math.max(0, -m.todayNetPnl);
  const dailyUsed = Math.min(dailyLimit, todayLossUsd);
  const dailyRemaining = Math.max(0, dailyLimit - todayLossUsd);

  const peak = Math.max(m.peakBalance, m.currentBalance);
  const trailLimit = Math.max(0, peak * (m.maxTrailingDrawdownPercent / 100));
  const trailingDd = Math.max(0, peak - m.currentBalance);
  const trailRemaining = Math.max(0, trailLimit - trailingDd);

  const dailyUtilization = dailyLimit > 0 ? Math.min(1, dailyUsed / dailyLimit) : 0;
  const trailingUtilization = trailLimit > 0 ? Math.min(1, trailingDd / trailLimit) : 0;

  return {
    distanceToLiquidationUsd: Math.min(dailyRemaining, trailRemaining),
    dailyLossUsedUsd: dailyUsed,
    dailyLossLimitUsd: dailyLimit,
    dailyUtilization,
    trailingDrawdownUsd: trailingDd,
    trailingLimitUsd: trailLimit,
    trailingUtilization,
  };
}

export type BarSeverity = "safe" | "warn" | "critical";

export function utilizationSeverity(utilization: number): BarSeverity {
  if (utilization >= 0.95) return "critical";
  if (utilization >= 0.8) return "warn";
  return "safe";
}
