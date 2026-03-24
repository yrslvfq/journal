export type TradePsychSlice = {
  pnl: number;
  fees: number;
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
};

export function tradeNet(t: TradePsychSlice): number {
  return t.pnl - t.fees;
}

export function psychSegmentStats(trades: TradePsychSlice[]): PsychSegmentStats {
  const wins = trades.filter((t) => tradeNet(t) > 0).length;
  const losses = trades.filter((t) => tradeNet(t) < 0).length;
  const decided = wins + losses;
  const totalPnl = trades.reduce((s, t) => s + tradeNet(t), 0);
  return {
    count: trades.length,
    wins,
    losses,
    winRate: decided > 0 ? (wins / decided) * 100 : 0,
    totalPnl,
    avgPnl: trades.length ? totalPnl / trades.length : 0,
  };
}

export function sleepBand(h: number): string {
  if (h < 6) return "< 6 ч";
  if (h < 7) return "6–7 ч";
  if (h < 8) return "7–8 ч";
  return "≥ 8 ч";
}
