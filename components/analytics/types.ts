import type { SleepBandId } from "@/lib/analytics-psych";

export type AnalyticsPeriod = "day" | "week" | "month" | "year" | "all" | "custom";

export type AnalyticsTabId =
  | "overview"
  | "funnel"
  | "risk"
  | "segments"
  | "time-patterns"
  | "quality"
  | "psych"
  | "advanced"
  | "behavior";

export type VolatilityBucketRow = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  profitFactor: number | null;
  pnl: number;
};

export type TraderBehaviorDto = {
  byVolatility: VolatilityBucketRow[];
  contextualTilt: {
    show: boolean;
    winRatePct: number | null;
    sampleSize: number;
    messageRu: string;
    messageEn: string;
  };
  postTradeDrift: { horizon: string; avgFavorablePoints: number | null; samples: number }[];
  ghostStop: {
    totalMissedProfitUsd: number;
    manualTradesInPeriod: number;
  };
};

export type MonteCarloBootstrapDto = {
  finalEquityP5: number;
  finalEquityP50: number;
  finalEquityP95: number;
  maxDdP5: number;
  maxDdP50: number;
  maxDdP95: number;
  meanFinalEquity: number;
  probFinalNegativePct: number;
};

export type MonteCarloDto = {
  tradeCount: number;
  iterations: number;
  historicalMaxDrawdown: number;
  maxDrawdownProbabilityPct: number;
  medianSimulatedMaxDrawdown: number;
  maxDdPercentiles: { p5: number; p50: number; p95: number; simMax: number };
  historicalMaxLossStreak: number;
  lossStreakGeHistoricalProbPct: number;
  simulatedLossStreakMedian: number;
  simulatedLossStreakP95: number;
  historicalMaxUnderwater: number;
  underwaterGeHistoricalProbPct: number;
  simulatedUnderwaterMedian: number;
  simulatedUnderwaterP95: number;
  historicalAvgR: number | null;
  simulatedAvgRMedian: number | null;
  bootstrap: MonteCarloBootstrapDto | null;
  ddHistogram: { binLabel: string; count: number }[];
  chartRows: { step: number; [key: string]: number | string }[];
  pathKeys: string[];
};

export type HeatmapCellDto = {
  weekday: number;
  weekdayLabel: string;
  hour: number;
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  profitFactor: number | null;
  pnl: number;
};

export type ActivityHeatmapDto = {
  cells: HeatmapCellDto[];
  usSessionHoursMsk: [number, number];
};

export type KellyAnalyticsDto = {
  winRateDecimal: number;
  payoffRatio: number | null;
  fullKellyFraction: number | null;
  fractionalKellyFraction: number | null;
  recommendedRiskFraction: number | null;
  recommendedRiskPct: number | null;
  capFraction: number;
  decidedTrades: number;
};

export type PsychSegmentRow = {
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  totalRisk: number;
  expectancyPerRisk: number | null;
};

export type PsychFieldCoverage = { count: number; percent: number };

export type AnalyticsPsychDto = {
  coverage: {
    total: number;
    withAny: number;
    percent: number;
    byField: {
      energy: PsychFieldCoverage;
      sleep: PsychFieldCoverage;
      stress: PsychFieldCoverage;
      mood: PsychFieldCoverage;
    };
  };
  byStress: (PsychSegmentRow & { level: string })[];
  byEnergy: (PsychSegmentRow & { energy: number })[];
  bySleepBand: (PsychSegmentRow & { band: SleepBandId })[];
  byMoodTag: (PsychSegmentRow & { tag: string })[];
  insights: {
    avgEnergyWins: number | null;
    avgEnergyLosses: number | null;
    avgSleepWins: number | null;
    avgSleepLosses: number | null;
    avgStressIndexWins: number | null;
    avgStressIndexLosses: number | null;
  };
  fragileState: PsychSegmentRow;
  stressEnergyGrid: (PsychSegmentRow & { stressLevel: string; energy: number })[];
  segmentHighlights: {
    bestEnergy: { energy: number; avgPnl: number; count: number } | null;
    worstEnergy: { energy: number; avgPnl: number; count: number } | null;
    bestStress: { level: string; avgPnl: number; count: number } | null;
    worstStress: { level: string; avgPnl: number; count: number } | null;
  };
};

export type ActionableInsightDto = {
  id: string;
  severity: "critical" | "warning" | "positive" | "info";
  titleEn: string;
  titleRu: string;
  detailEn: string;
  detailRu: string;
  href?: string;
};

export type AnalyticsRecapSummaryDto = {
  recapsInPeriod: number;
  avgDisciplineScore: number;
  avgSessionEfficiency: number | null;
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
  monteCarlo: MonteCarloDto;
  activityHeatmap: ActivityHeatmapDto;
  kelly: KellyAnalyticsDto;
  traderBehavior: TraderBehaviorDto;
  recapSummary?: AnalyticsRecapSummaryDto | null;
  actionableInsights?: ActionableInsightDto[];
};
