export type SessionPersonaId = "sniper" | "machine_gunner" | "brokers_best_friend" | "balanced";

export type DaySessionMetrics = {
  tradesCount: number;
  netPnl: number;
  totalFees: number;
  /** Net P&L divided by total commissions (interpretable as $ profit per $1 paid in fees). */
  efficiencyPerFeeUsd: number | null;
  /** Literal reading of (net) / (sumFees × tradesCount) when both positive. */
  efficiencyUserFormula: number | null;
  persona: SessionPersonaId;
  /** 0–100 for UI bar, derived from efficiencyPerFeeUsd. */
  efficiencyScore: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function computeDaySessionMetrics(
  trades: { pnl: number; fees: number }[]
): DaySessionMetrics {
  const n = trades.length;
  const netPnl = trades.reduce((s, t) => s + t.pnl - t.fees, 0);
  const totalFees = trades.reduce((s, t) => s + t.fees, 0);
  const efficiencyPerFeeUsd = totalFees > 0 ? netPnl / totalFees : null;
  const denomUser = totalFees * n;
  const efficiencyUserFormula = denomUser > 0 ? netPnl / denomUser : null;

  let persona: SessionPersonaId = "balanced";
  if (n >= 12 && netPnl <= 0) {
    persona = "brokers_best_friend";
  } else if (n >= 6) {
    persona = "machine_gunner";
  } else if (n >= 1 && n <= 3 && netPnl > 0) {
    persona = "sniper";
  }

  let efficiencyScore = 50;
  if (efficiencyPerFeeUsd != null) {
    efficiencyScore = clamp(50 + efficiencyPerFeeUsd * 15, 0, 100);
  } else if (n === 0) {
    efficiencyScore = 0;
  }

  return {
    tradesCount: n,
    netPnl,
    totalFees,
    efficiencyPerFeeUsd,
    efficiencyUserFormula,
    persona,
    efficiencyScore,
  };
}
