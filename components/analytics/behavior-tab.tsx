"use client";

import { Activity, Crosshair, Ghost, Skull, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TraderBehaviorDto } from "@/components/analytics/types";
import { useAppLanguage } from "@/lib/app-language";
import { dashboardT } from "@/lib/i18n/dashboard";

type Props = { data: TraderBehaviorDto };

export function BehaviorAnalyticsTab({ data }: Props) {
  const lang = useAppLanguage();
  const bt = dashboardT(lang).behaviorTab;

  const volName = (key: string, fallback: string) => {
    const m: Record<string, string> = {
      low: bt.volLow,
      medium: bt.volMedium,
      high: bt.volHigh,
      unspecified: bt.volUnspecified,
    };
    return m[key] ?? fallback;
  };

  const volChart = data.byVolatility
    .filter((r) => r.trades > 0)
    .map((r) => ({
      name: volName(r.key, r.label),
      winRate: Math.round(r.winRatePct * 10) / 10,
      pf: r.profitFactor != null ? Math.min(99, r.profitFactor) : 0,
      n: r.trades,
    }));

  const driftChart = data.postTradeDrift.map((d) => ({
    name: d.horizon,
    avg: d.avgFavorablePoints != null ? Math.round(d.avgFavorablePoints * 100) / 100 : 0,
    samples: d.samples,
  }));

  return (
    <div className="space-y-6 font-mono text-sm">
      <section className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          {bt.volTitle}
        </div>
        {volChart.length === 0 ? (
          <p className="text-xs text-slate-500">{bt.volEmpty}</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} stroke="#334155" />
                <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 10 }} stroke="#334155" />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 10 }} stroke="#334155" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="left" dataKey="winRate" name={bt.chartWinRate} fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="pf" name={bt.chartPf} fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{bt.volFoot}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Activity className="h-4 w-4 text-amber-400" />
            {bt.driftTitle}
          </div>
          {driftChart.every((d) => d.samples === 0) ? (
            <p className="text-xs text-slate-500">{bt.driftEmpty}</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driftChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as { name: string; avg: number; samples: number };
                      return (
                        <div className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200">
                          <p className="font-medium">{row.name}</p>
                          <p className="tabular-nums text-cyan-300">
                            {bt.driftTooltipAvg}: {row.avg}
                          </p>
                          <p className="text-slate-500">
                            {bt.driftTooltipSamples}: {row.samples}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avg" name={bt.driftTooltipAvg} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-500">{bt.driftFoot}</p>
        </section>

        <section className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Ghost className="h-4 w-4 text-violet-400" />
            {bt.ghostTitle}
          </div>
          <p className="text-2xl font-bold tabular-nums text-violet-200">
            ${data.ghostStop.totalMissedProfitUsd.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{bt.ghostFoot(data.ghostStop.manualTradesInPeriod)}</p>
        </section>
      </div>
    </div>
  );
}

export function sessionPersonaIcon(persona: string) {
  switch (persona) {
    case "sniper":
      return Crosshair;
    case "machine_gunner":
      return Activity;
    case "brokers_best_friend":
      return Skull;
    default:
      return TrendingUp;
  }
}
