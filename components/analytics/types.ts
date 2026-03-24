export type AnalyticsPeriod = "day" | "week" | "month" | "year" | "all" | "custom";

export type AnalyticsTabId =
  | "overview"
  | "funnel"
  | "risk"
  | "segments"
  | "time-patterns"
  | "quality"
  | "psych";

export type PsychSegmentRow = {
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
};

export type AnalyticsPsychDto = {
  coverage: { total: number; withAny: number; percent: number };
  byStress: (PsychSegmentRow & { level: string; label: string })[];
  byEnergy: (PsychSegmentRow & { energy: number })[];
  bySleepBand: (PsychSegmentRow & { band: string })[];
  byMoodTag: (PsychSegmentRow & { tag: string })[];
  insights: {
    avgEnergyWins: number | null;
    avgEnergyLosses: number | null;
    avgSleepWins: number | null;
    avgSleepLosses: number | null;
  };
};

export type AnalyticsDto = {
  summary: {
    totalPnl: number;
    tradesCount: number;
    wins: number;
    losses: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    expectancy: number;
    profitFactor?: number;
    maxDrawdown?: number;
    currentWinStreak?: number;
    currentLossStreak?: number;
    maxWinStreak?: number;
    maxLossStreak?: number;
    avgTrade?: number | null;
    medianTrade?: number | null;
    stdDevPnl?: number | null;
    sharpeRatio?: number | null;
    payoffRatio?: number | null;
    recoveryFactor?: number | null;
    calmarRatio?: number | null;
    bestTrade?: number | null;
    worstTrade?: number | null;
    breakevenCount?: number | null;
    expectancyPerRisk?: number | null;
    totalRisk?: number | null;
    tradesPerDay?: number | null;
  };
  bySymbol: { symbol: string; pnl: number; count: number }[];
  bySetup: { id: string; name: string; pnl: number; count: number }[];
  byConfirmation: { id: string; name: string; pnl: number; count: number }[];
  dailyPnl: { date: string; pnl: number }[];
  cumulativeData: { date: string; pnl: number; cumulative: number }[];
  drawdownData?: { date: string; cumulative: number; drawdown: number }[];
  psych: AnalyticsPsychDto;
};
