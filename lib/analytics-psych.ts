export type TradePsychSlice = {
  pnl: number;
  fees: number;
  risk: number;
  energyLevel: number | null;
  sleepHours: number | null;
  stressLevel: string | null;
  stateMoodTag: string | null;
};

export type PsychSegmentStats = {
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  totalRisk: number;
  expectancyPerRisk: number | null;
};

export function tradeNet(t: TradePsychSlice): number {
  return t.pnl - t.fees;
}

/** low → 1, medium → 2, high → 3; unknown values → null */
export function stressLevelToIndex(level: string | null): number | null {
  if (!level) return null;
  const m: Record<string, number> = { low: 1, medium: 2, high: 3 };
  return m[level] ?? null;
}

export function psychSegmentStats(trades: TradePsychSlice[]): PsychSegmentStats {
  const wins = trades.filter((t) => tradeNet(t) > 0).length;
  const losses = trades.filter((t) => tradeNet(t) < 0).length;
  const decided = wins + losses;
  const totalPnl = trades.reduce((s, t) => s + tradeNet(t), 0);
  const totalRisk = trades.reduce((s, t) => s + t.risk, 0);
  const expectancyPerRisk = totalRisk > 0 ? totalPnl / totalRisk : null;
  return {
    count: trades.length,
    wins,
    losses,
    winRate: decided > 0 ? (wins / decided) * 100 : 0,
    totalPnl,
    avgPnl: trades.length ? totalPnl / trades.length : 0,
    totalRisk,
    expectancyPerRisk,
  };
}

export type SleepBandId = "lt6" | "6-7" | "7-8" | "gte8";

export const SLEEP_BAND_ORDER: SleepBandId[] = ["lt6", "6-7", "7-8", "gte8"];

export function sleepBandId(h: number): SleepBandId {
  if (h < 6) return "lt6";
  if (h < 7) return "6-7";
  if (h < 8) return "7-8";
  return "gte8";
}
