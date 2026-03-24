import { AdvancedAnalyticsTab } from "@/components/analytics/advanced-tab";
import { BehaviorAnalyticsTab } from "@/components/analytics/behavior-tab";
import { AnalyticsDto, AnalyticsTabId } from "@/components/analytics/types";
import {
  FunnelTab,
  OverviewTab,
  PsychTab,
  QualityTab,
  RiskTab,
  SegmentsTab,
  TimePatternsTab,
  type AnalyticsViewModel,
} from "@/components/analytics/tabs";

type Props = {
  activeTab: AnalyticsTabId;
  data: AnalyticsDto;
};

export function AnalyticsTabContent({ activeTab, data }: Props) {
  const {
    summary,
    bySymbol,
    bySetup,
    byConfirmation,
    dailyPnl,
    cumulativeData,
    drawdownData,
    psych,
    actionableInsights,
    recapSummary,
    traderBehavior,
  } = data;
  const totalTrades = summary.tradesCount || 0;
  const breakevenCount = summary.breakevenCount ?? Math.max(0, totalTrades - summary.wins - summary.losses);
  const rrEstimate = summary.avgLoss ? Math.abs(summary.avgWin / summary.avgLoss) : null;
  const positiveDays = dailyPnl.filter((d) => d.pnl > 0).length;
  const negativeDays = dailyPnl.filter((d) => d.pnl < 0).length;
  const dayWinRate =
    positiveDays + negativeDays > 0 ? (positiveDays / (positiveDays + negativeDays)) * 100 : 0;
  const weekdayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byWeekday = weekdayMap.map((label, index) => {
    const values = dailyPnl.filter((d) => new Date(d.date).getDay() === index).map((d) => d.pnl);
    const count = values.length;
    const pnl = values.reduce((sum, value) => sum + value, 0);
    const wins = values.filter((v) => v > 0).length;
    return {
      day: label,
      count,
      pnl,
      avg: count > 0 ? pnl / count : 0,
      winRate: count > 0 ? (wins / count) * 100 : 0,
    };
  });
  const symbolRows = [...bySymbol].sort((a, b) => b.pnl - a.pnl);
  const setupRows = [...bySetup].sort((a, b) => b.pnl - a.pnl);
  const confirmationRows = [...byConfirmation].sort((a, b) => b.pnl - a.pnl);
  const consistencyScore = Math.max(
    0,
    Math.min(
      100,
      35 * (summary.winRate / 100) +
        35 * Math.min(1, (summary.profitFactor ?? 0) / 2) +
        30 * Math.max(0, 1 - (summary.maxLossStreak ?? 0) / 10)
    )
  );
  const activeConsistencyTrend = [
    { label: "Win rate", score: Math.round(summary.winRate) },
    { label: "Profit factor", score: Math.round(Math.min(100, ((summary.profitFactor ?? 0) / 2) * 100)) },
    { label: "Discipline", score: Math.round(Math.max(0, 100 - (summary.maxLossStreak ?? 0) * 10)) },
  ];

  const vm: AnalyticsViewModel = {
    summary,
    bySymbol,
    bySetup,
    byConfirmation,
    dailyPnl,
    cumulativeData,
    drawdownData,
    psych,
    totalTrades,
    breakevenCount,
    rrEstimate,
    dayWinRate,
    byWeekday,
    symbolRows,
    setupRows,
    confirmationRows,
    consistencyScore,
    activeConsistencyTrend,
    actionableInsights: actionableInsights ?? [],
    recapSummary: recapSummary ?? null,
    contextualTilt: traderBehavior?.contextualTilt,
  };

  if (activeTab === "funnel") return <FunnelTab vm={vm} />;
  if (activeTab === "risk") return <RiskTab vm={vm} />;
  if (activeTab === "segments") return <SegmentsTab vm={vm} />;
  if (activeTab === "time-patterns") return <TimePatternsTab vm={vm} />;
  if (activeTab === "quality") return <QualityTab vm={vm} />;
  if (activeTab === "psych") return <PsychTab vm={vm} />;
  if (activeTab === "advanced") {
    return (
      <AdvancedAnalyticsTab
        monteCarlo={data.monteCarlo}
        activityHeatmap={data.activityHeatmap}
        kelly={data.kelly}
      />
    );
  }
  if (activeTab === "behavior") {
    return <BehaviorAnalyticsTab data={data.traderBehavior} />;
  }
  return <OverviewTab vm={vm} />;
}
