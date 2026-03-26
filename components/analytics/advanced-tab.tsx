"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ActivityHeatmapDto,
  HeatmapCellDto,
  KellyAnalyticsDto,
  MonteCarloDto,
} from "@/components/analytics/types";
import { useAppLanguage } from "@/lib/app-language";
import { dashboardT } from "@/lib/i18n/dashboard";

const PATH_COLORS = [
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#38bdf8",
  "#c084fc",
  "#4ade80",
  "#fb7185",
  "#94a3b8",
];

type Props = {
  monteCarlo: MonteCarloDto;
  activityHeatmap: ActivityHeatmapDto;
  kelly: KellyAnalyticsDto;
};

function heatmapValue(cell: HeatmapCellDto, metric: "wr" | "pf"): number | null {
  if (cell.trades === 0) return null;
  if (metric === "wr") return cell.winRatePct;
  if (cell.profitFactor == null) return null;
  return Math.min(cell.profitFactor, 3);
}

function heatmapColor(value: number | null, metric: "wr" | "pf"): string {
  if (value == null) return "rgba(30, 41, 59, 0.85)";
  if (metric === "wr") {
    const t = Math.max(0, Math.min(1, value / 100));
    const r = Math.round(30 + (220 - 30) * (1 - t));
    const g = Math.round(41 + (200 - 41) * t);
    const b = Math.round(59 + (100 - 59) * (1 - t));
    return `rgba(${r},${g},${b},0.92)`;
  }
  const t = Math.max(0, Math.min(1, (value - 0.5) / 1.5));
  const r = Math.round(30 + (220 - 30) * (1 - t));
  const g = Math.round(41 + (200 - 41) * t);
  const b = Math.round(59 + (100 - 59) * (1 - t));
  return `rgba(${r},${g},${b},0.92)`;
}

function weekdayLabel(
  t: { wd1: string; wd2: string; wd3: string; wd4: string; wd5: string },
  weekday: number
): string {
  const labels = [t.wd1, t.wd2, t.wd3, t.wd4, t.wd5];
  return labels[weekday - 1] ?? "—";
}

export function AdvancedAnalyticsTab({ monteCarlo, activityHeatmap, kelly }: Props) {
  const lang = useAppLanguage();
  const t = dashboardT(lang).advancedTab;
  const [metric, setMetric] = useState<"wr" | "pf">("wr");
  const [profitableOnly, setProfitableOnly] = useState(false);
  const [usStart, usEnd] = activityHeatmap.usSessionHoursMsk;

  const grid = useMemo(() => {
    const byDay = new Map<number, HeatmapCellDto[]>();
    for (const c of activityHeatmap.cells) {
      if (!byDay.has(c.weekday)) byDay.set(c.weekday, []);
      byDay.get(c.weekday)!.push(c);
    }
    return [1, 2, 3, 4, 5].map((wd) => (byDay.get(wd) ?? []).sort((a, b) => a.hour - b.hour));
  }, [activityHeatmap.cells]);

  const lowSample = monteCarlo.tradeCount > 0 && monteCarlo.tradeCount < 40;
  const capStr = (kelly.capFraction * 100).toFixed(1);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="text-sm font-medium text-slate-200">{t.mcTitle}</h3>
        <p className="mt-1 text-xs text-slate-500">{t.mcIntro(monteCarlo.iterations)}</p>
        {lowSample && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            {t.mcLowSample}
          </p>
        )}
        {monteCarlo.tradeCount < 2 ? (
          <p className="mt-4 text-sm text-slate-500">{t.mcNeedTwo}</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcHistDd}</p>
                <p className="mt-0.5 text-base font-semibold text-red-300 tabular-nums">
                  {monteCarlo.historicalMaxDrawdown.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcDdProb}</p>
                <p className="mt-0.5 text-base font-semibold text-white tabular-nums">
                  {monteCarlo.maxDrawdownProbabilityPct.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcMedianDd}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-200 tabular-nums">
                  {monteCarlo.medianSimulatedMaxDrawdown.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcDdP5}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-300 tabular-nums">
                  {monteCarlo.maxDdPercentiles.p5.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcDdP95}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-300 tabular-nums">
                  {monteCarlo.maxDdPercentiles.p95.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcDdSimMax}</p>
                <p className="mt-0.5 text-base font-semibold text-orange-300/90 tabular-nums">
                  {monteCarlo.maxDdPercentiles.simMax.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcLossStreakHist}</p>
                <p className="mt-0.5 text-base font-semibold text-white tabular-nums">
                  {monteCarlo.historicalMaxLossStreak}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcLossStreakProb}</p>
                <p className="mt-0.5 text-base font-semibold text-white tabular-nums">
                  {monteCarlo.lossStreakGeHistoricalProbPct.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcLossStreakMed}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-300 tabular-nums">
                  {monteCarlo.simulatedLossStreakMedian.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcLossStreakP95}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-300 tabular-nums">
                  {monteCarlo.simulatedLossStreakP95.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcUwHist}</p>
                <p className="mt-0.5 text-base font-semibold text-white tabular-nums">
                  {monteCarlo.historicalMaxUnderwater}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcUwProb}</p>
                <p className="mt-0.5 text-base font-semibold text-white tabular-nums">
                  {monteCarlo.underwaterGeHistoricalProbPct.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcUwMed}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-300 tabular-nums">
                  {monteCarlo.simulatedUnderwaterMedian.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcUwP95}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-300 tabular-nums">
                  {monteCarlo.simulatedUnderwaterP95.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcAvgRHist}</p>
                <p className="mt-0.5 text-base font-semibold text-cyan-300/90 tabular-nums">
                  {monteCarlo.historicalAvgR != null ? monteCarlo.historicalAvgR.toFixed(2) : t.mcAvgRNa}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-[11px] text-slate-500">{t.mcAvgRSim}</p>
                <p className="mt-0.5 text-base font-semibold text-cyan-300/90 tabular-nums">
                  {monteCarlo.simulatedAvgRMedian != null
                    ? monteCarlo.simulatedAvgRMedian.toFixed(2)
                    : t.mcAvgRNa}
                </p>
              </div>
            </div>

            {monteCarlo.ddHistogram.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-slate-400">{t.mcHistChartTitle}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monteCarlo.ddHistogram} margin={{ bottom: 4, left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="binLabel"
                        tick={{ fill: "#94a3b8", fontSize: 9 }}
                        stroke="#64748b"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} stroke="#64748b" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          fontSize: 11,
                        }}
                        formatter={(v: number) => [v, t.mcHistY]}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name={t.mcHistY} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-slate-400">{t.mcPermChartTitle}</p>
              <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monteCarlo.chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="step" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {monteCarlo.pathKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={PATH_COLORS[i % PATH_COLORS.length]}
                      dot={false}
                      strokeWidth={1.2}
                      name={t.pathLabel(i + 1)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>

            {monteCarlo.bootstrap && (
              <div className="mt-6 rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
                <h4 className="text-xs font-semibold text-violet-200">{t.mcBootstrapTitle}</h4>
                <p className="mt-1 text-[11px] text-slate-500">{t.mcBootstrapIntro}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[10px] text-slate-500">{t.mcBootFinalP5}</p>
                    <p className="text-sm font-semibold tabular-nums text-white">
                      {monteCarlo.bootstrap.finalEquityP5.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">{t.mcBootFinalP50}</p>
                    <p className="text-sm font-semibold tabular-nums text-white">
                      {monteCarlo.bootstrap.finalEquityP50.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">{t.mcBootFinalP95}</p>
                    <p className="text-sm font-semibold tabular-nums text-white">
                      {monteCarlo.bootstrap.finalEquityP95.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">{t.mcBootMeanFinal}</p>
                    <p className="text-sm font-semibold tabular-nums text-white">
                      {monteCarlo.bootstrap.meanFinalEquity.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">{t.mcBootProbNeg}</p>
                    <p className="text-sm font-semibold tabular-nums text-amber-300">
                      {monteCarlo.bootstrap.probFinalNegativePct.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">{t.mcBootDdP50}</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-200">
                      {monteCarlo.bootstrap.maxDdP50.toFixed(2)}
                    </p>
                  </div>
                </div>
                {monteCarlo.bootstrapChartRows.length > 0 && monteCarlo.bootstrapPathKeys.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-1 text-xs font-medium text-slate-400">{t.mcBootstrapChartTitle}</p>
                    <p className="mb-2 text-[11px] text-slate-500">{t.mcBootstrapChartHint}</p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monteCarlo.bootstrapChartRows}
                          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis
                            dataKey="step"
                            stroke="#64748b"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                          />
                          <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1e293b",
                              border: "1px solid #334155",
                              borderRadius: "12px",
                              fontSize: 12,
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          {monteCarlo.bootstrapPathKeys.map((key, i) => (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={key}
                              stroke={PATH_COLORS[i % PATH_COLORS.length]}
                              dot={false}
                              strokeWidth={1.2}
                              name={t.bootstrapPathLabel(i + 1)}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-200">{t.heatmapTitle}</h3>
            <p className="mt-1 text-xs text-slate-500">{t.heatmapSub(usStart, usEnd)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as "wr" | "pf")}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="wr">{t.heatColorWr}</option>
              <option value="pf">{t.heatColorPf}</option>
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={profitableOnly}
                onChange={(e) => setProfitableOnly(e.target.checked)}
                className="rounded border-slate-600"
              />
              {t.heatProfitableOnly}
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-center text-[10px] sm:text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-900/95 p-1 text-slate-500">{t.heatDayCol}</th>
                {Array.from({ length: 24 }, (_, h) => (
                  <th
                    key={h}
                    className={`p-1 font-normal text-slate-500 ${h >= usStart && h <= usEnd ? "text-amber-300/90" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, ri) => (
                <tr key={ri}>
                  <td className="sticky left-0 z-10 bg-slate-900/95 p-1 text-left text-slate-400">
                    {row[0] ? weekdayLabel(t, row[0].weekday) : "—"}
                  </td>
                  {row.map((cell) => {
                    const raw = heatmapValue(cell, metric);
                    const profitable =
                      cell.trades > 0 && cell.pnl > 0 && cell.winRatePct >= 50;
                    const showMuted =
                      profitableOnly && cell.trades > 0 && !profitable;
                    const bg = showMuted ? "rgba(15, 23, 42, 0.5)" : heatmapColor(raw, metric);
                    const wdl = weekdayLabel(t, cell.weekday);
                    const title =
                      cell.trades === 0
                        ? t.heatNoTrades
                        : `${wdl} ${cell.hour}:00 MSK\nTrades: ${cell.trades}\nWR: ${cell.winRatePct.toFixed(0)}%\nPF: ${cell.profitFactor != null ? cell.profitFactor.toFixed(2) : "—"}\nP&L: ${cell.pnl.toFixed(2)}`;
                    return (
                      <td
                        key={`${cell.weekday}-${cell.hour}`}
                        title={title}
                        className="p-0.5"
                        style={{
                          backgroundColor: bg,
                          opacity: showMuted ? 0.35 : 1,
                        }}
                      >
                        <div className="flex h-8 items-center justify-center font-medium text-white/90">
                          {cell.trades === 0 ? "·" : metric === "wr" ? `${Math.round(cell.winRatePct)}` : ""}
                          {cell.trades > 0 && metric === "pf" && (cell.profitFactor != null ? cell.profitFactor.toFixed(1) : "—")}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t.heatFootnote}</p>
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="text-sm font-medium text-slate-200">{t.kellyTitle}</h3>
        <p className="mt-1 text-xs text-slate-500">{t.kellyIntro(capStr)}</p>
        {kelly.decidedTrades === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{t.kellyNoTrades}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">{t.kellyWinRate}</p>
              <p className="mt-1 text-lg font-semibold text-white">{(kelly.winRateDecimal * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">{t.kellyPayoff}</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {kelly.payoffRatio != null ? kelly.payoffRatio.toFixed(2) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">{t.kellyFull}</p>
              <p className="mt-1 text-lg font-semibold text-amber-200/90">
                {kelly.fullKellyFraction != null ? `${(kelly.fullKellyFraction * 100).toFixed(2)}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 ring-1 ring-blue-500/30">
              <p className="text-xs text-slate-500">{t.kellyRec}</p>
              <p className="mt-1 text-xl font-bold text-blue-300">
                {kelly.recommendedRiskPct != null ? `${kelly.recommendedRiskPct.toFixed(2)}%` : "—"}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
