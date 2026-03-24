"use client";

import { useMemo, useState } from "react";
import {
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

export function AdvancedAnalyticsTab({ monteCarlo, activityHeatmap, kelly }: Props) {
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

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="text-sm font-medium text-slate-200">Monte Carlo (order shuffle)</h3>
        <p className="mt-1 text-xs text-slate-500">
          {monteCarlo.iterations} runs on your trade P&amp;L sequence; curves show cumulative equity for 10 sample
          shuffles. &quot;Max drawdown probability&quot; is how often a random order produced max drawdown at least as
          large as your actual chronological path.
        </p>
        {lowSample && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            Fewer than ~40 trades: paths are illustrative; use more data for stable inference.
          </p>
        )}
        {monteCarlo.tradeCount < 2 ? (
          <p className="mt-4 text-sm text-slate-500">Need at least 2 trades in this period.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500">Historical max DD (chronological)</p>
                <p className="mt-1 text-lg font-semibold text-red-300">
                  {monteCarlo.historicalMaxDrawdown.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500">Max drawdown probability</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {monteCarlo.maxDrawdownProbabilityPct.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500">Median simulated max DD</p>
                <p className="mt-1 text-lg font-semibold text-slate-200">
                  {monteCarlo.medianSimulatedMaxDrawdown.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-5 h-72">
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
                      name={`Path ${i + 1}`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-200">Activity heatmap (Europe/Moscow)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Rows: Mon–Fri. Entry hour in MSK. US cash session for ES/NQ highlighted ({usStart}:00–{usEnd}:00).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as "wr" | "pf")}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="wr">Color: win rate</option>
              <option value="pf">Color: profit factor</option>
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={profitableOnly}
                onChange={(e) => setProfitableOnly(e.target.checked)}
                className="rounded border-slate-600"
              />
              Profitable hours only
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-center text-[10px] sm:text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-900/95 p-1 text-slate-500">Day</th>
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
                    {row[0]?.weekdayLabel ?? "—"}
                  </td>
                  {row.map((cell) => {
                    const raw = heatmapValue(cell, metric);
                    const profitable =
                      cell.trades > 0 && cell.pnl > 0 && cell.winRatePct >= 50;
                    const showMuted =
                      profitableOnly && cell.trades > 0 && !profitable;
                    const bg = showMuted ? "rgba(15, 23, 42, 0.5)" : heatmapColor(raw, metric);
                    const title =
                      cell.trades === 0
                        ? "No trades"
                        : `${cell.weekdayLabel} ${cell.hour}:00 MSK\nTrades: ${cell.trades}\nWR: ${cell.winRatePct.toFixed(0)}%\nPF: ${cell.profitFactor != null ? cell.profitFactor.toFixed(2) : "—"}\nP&L: ${cell.pnl.toFixed(2)}`;
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
        <p className="mt-2 text-xs text-slate-500">
          With &quot;Profitable hours only&quot;, cells that are not both net-positive and ≥50% win rate are faded so
          stronger slots stand out.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="text-sm font-medium text-slate-200">Kelly criterion</h3>
        <p className="mt-1 text-xs text-slate-500">
          Full Kelly: f* = W − (1 − W) / R (W = win rate, R = avg win / avg loss). Shown recommendation uses 25%
          (fractional Kelly) and is capped at {(kelly.capFraction * 100).toFixed(1)}% per trade.
        </p>
        {kelly.decidedTrades === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No win/loss trades in this period.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Win rate (W)</p>
              <p className="mt-1 text-lg font-semibold text-white">{(kelly.winRateDecimal * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Payoff ratio (R)</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {kelly.payoffRatio != null ? kelly.payoffRatio.toFixed(2) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Full Kelly (reference)</p>
              <p className="mt-1 text-lg font-semibold text-amber-200/90">
                {kelly.fullKellyFraction != null ? `${(kelly.fullKellyFraction * 100).toFixed(2)}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 ring-1 ring-blue-500/30">
              <p className="text-xs text-slate-500">Recommended risk (¼ Kelly, capped)</p>
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
