/**
 * Derives prioritized, user-facing insights from analytics aggregates.
 * Used by GET /api/analytics so dashboard and hub share one source of truth.
 */

export type InsightSeverity = "critical" | "warning" | "positive" | "info";

export type ActionableInsightDto = {
  id: string;
  severity: InsightSeverity;
  titleEn: string;
  titleRu: string;
  detailEn: string;
  detailRu: string;
  /** Deep-link into Analytics Hub */
  href?: string;
};

type SummarySlice = {
  tradesCount: number;
  wins: number;
  losses: number;
  winRate: number;
  expectancy: number;
  profitFactor: number;
  maxDrawdown: number;
  maxLossStreak: number;
  totalPnl: number;
};

type PsychSlice = {
  coverage: { total: number; withAny: number; percent: number };
  segmentHighlights: {
    worstStress: { level: string; avgPnl: number; count: number } | null;
    worstEnergy: { energy: number; avgPnl: number; count: number } | null;
  };
};

type BehaviorSlice = {
  contextualTilt: { show: boolean; winRatePct: number | null; sampleSize: number };
  ghostStop: { totalMissedProfitUsd: number; manualTradesInPeriod: number };
};

type KellySlice = {
  recommendedRiskPct: number | null;
  decidedTrades: number;
};

type RecapSlice = {
  recapsInPeriod: number;
  avgDisciplineScore: number | null;
};

export function buildActionableInsights(params: {
  summary: SummarySlice;
  psych: PsychSlice;
  traderBehavior: BehaviorSlice;
  kelly: KellySlice;
  recapSummary: RecapSlice | null;
}): ActionableInsightDto[] {
  const out: ActionableInsightDto[] = [];
  const { summary, psych, traderBehavior, kelly, recapSummary } = params;
  const n = summary.tradesCount;

  if (traderBehavior.contextualTilt.show) {
    const wr = traderBehavior.contextualTilt.winRatePct;
    out.push({
      id: "low-vol-tilt",
      severity: "critical",
      titleEn: "Low-volatility edge warning",
      titleRu: "Предупреждение: низкая волатильность",
      detailEn:
        wr != null
          ? `Win rate ~${wr.toFixed(0)}% in low-vol conditions (${traderBehavior.contextualTilt.sampleSize} trades). Consider standing aside in tight ranges.`
          : "Your stats suggest weakness in low-volatility conditions. Review Behavior → volatility buckets.",
      detailRu:
        wr != null
          ? `Винрейт ~${wr.toFixed(0)}% при низкой волатильности (${traderBehavior.contextualTilt.sampleSize} сделок). Возможно, стоит не торговать в узких диапазонах.`
          : "Статистика указывает на слабость в низкой волатильности. См. вкладку Behavior.",
      href: "/dashboard/analytics?tab=behavior",
    });
  }

  if (n >= 8 && summary.profitFactor > 0 && summary.profitFactor < 1) {
    out.push({
      id: "profit-factor-below-one",
      severity: "warning",
      titleEn: "Profit factor below 1",
      titleRu: "Profit factor ниже 1",
      detailEn: `Gross losses outweigh gross wins over this period (PF ${summary.profitFactor.toFixed(2)}). Tighten setups or reduce size until edge recovers.`,
      detailRu: `За период убытки перекрывают прибыль (PF ${summary.profitFactor.toFixed(2)}). Ужесточите сетапы или размер до восстановления edge.`,
      href: "/dashboard/analytics?tab=risk",
    });
  }

  if (n >= 5 && summary.maxLossStreak >= 4) {
    out.push({
      id: "loss-streak",
      severity: "warning",
      titleEn: "Long loss streak",
      titleRu: "Длинная серия убытков",
      detailEn: `Max loss streak reached ${summary.maxLossStreak}. Pause, review rules, or reduce risk after clusters of losses.`,
      detailRu: `Макс. серия убытков — ${summary.maxLossStreak}. Сделайте паузу и пересмотрите правила или риск.`,
      href: "/dashboard/analytics?tab=overview",
    });
  }

  const ghost = traderBehavior.ghostStop;
  if (ghost.manualTradesInPeriod >= 3 && ghost.totalMissedProfitUsd > 25) {
    out.push({
      id: "ghost-stop",
      severity: "info",
      titleEn: "Manual exits vs plan",
      titleRu: "Ручные выходы vs план",
      detailEn: `Estimated ~$${ghost.totalMissedProfitUsd.toFixed(0)} left on the table vs planned targets on manual exits (${ghost.manualTradesInPeriod} trades).`,
      detailRu: `Оценочно ~$${ghost.totalMissedProfitUsd.toFixed(0)} не взято относительно плана при ручных выходах (${ghost.manualTradesInPeriod} сделок).`,
      href: "/dashboard/analytics?tab=behavior",
    });
  }

  const ws = psych.segmentHighlights.worstStress;
  if (ws && ws.count >= 3 && ws.avgPnl < 0) {
    out.push({
      id: "stress-segment",
      severity: "warning",
      titleEn: "Stress and P&L",
      titleRu: "Стресс и P&L",
      detailEn: `Under "${ws.level}" stress, avg P&L is negative (${ws.count} trades). Favor lighter size or no-trade when stress is elevated.`,
      detailRu: `При стрессе "${ws.level}" средний P&L отрицательный (${ws.count} сделок). Снижайте размер или пропускайте сессию.`,
      href: "/dashboard/analytics?tab=psych",
    });
  }

  if (psych.coverage.total >= 10 && psych.coverage.percent < 25) {
    out.push({
      id: "psych-coverage",
      severity: "info",
      titleEn: "Log energy & stress",
      titleRu: "Логируйте энергию и стресс",
      detailEn: `Only ${psych.coverage.percent.toFixed(0)}% of trades include psych fields. Filling them unlocks segment analytics and tilt detection.`,
      detailRu: `Только ${psych.coverage.percent.toFixed(0)}% сделок с психо-полями. Заполнение улучшит сегментную аналитику.`,
      href: "/dashboard/analytics?tab=psych",
    });
  }

  if (n >= 15 && summary.expectancy > 0 && summary.winRate >= 45 && summary.profitFactor >= 1.2) {
    out.push({
      id: "edge-positive",
      severity: "positive",
      titleEn: "Positive expectancy",
      titleRu: "Положительное мат. ожидание",
      detailEn: `Expectancy +${summary.expectancy.toFixed(2)} per trade with PF ${summary.profitFactor.toFixed(2)}. Focus on execution consistency and sizing.`,
      detailRu: `Мат. ожидание +${summary.expectancy.toFixed(2)} на сделку, PF ${summary.profitFactor.toFixed(2)}. Держите дисциплину исполнения и сайзинг.`,
      href: "/dashboard/analytics?tab=overview",
    });
  }

  if (kelly.decidedTrades >= 20 && kelly.recommendedRiskPct != null) {
    out.push({
      id: "kelly-cap",
      severity: "info",
      titleEn: "Risk cap hint (Kelly)",
      titleRu: "Подсказка по риску (Kelly)",
      detailEn: `Fractional Kelly suggests ~${kelly.recommendedRiskPct.toFixed(2)}% of capital per trade (capped). Use as a sanity check, not a target.`,
      detailRu: `Дробный Келли ~${kelly.recommendedRiskPct.toFixed(2)}% капитала на сделку (с ограничением). Ориентир, не цель.`,
      href: "/dashboard/analytics?tab=advanced",
    });
  }

  if (recapSummary && recapSummary.recapsInPeriod >= 1 && recapSummary.avgDisciplineScore != null) {
    const d = recapSummary.avgDisciplineScore;
    if (d < 50) {
      out.push({
        id: "recap-discipline-low",
        severity: "warning",
        titleEn: "Daily discipline checklist",
        titleRu: "Чеклист дисциплины",
        detailEn: `Average discipline score from daily recaps is ${d.toFixed(0)}/100. Tighten loss limits and setup-only rules.`,
        detailRu: `Средний балл дисциплины по итогам дня — ${d.toFixed(0)}/100. Усильте лимиты и торговлю только по сетапам.`,
        href: "/dashboard/daily-recaps",
      });
    }
  }

  const severityOrder: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    positive: 3,
  };
  out.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return out.slice(0, 8);
}
