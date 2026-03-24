"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAppLanguage } from "@/lib/app-language";
import type { AnalyticsDto } from "@/components/analytics/types";
import {
  ActionableInsightsList,
  ContextualTiltBanner,
  RecapSummaryStrip,
} from "@/components/analytics/insight-blocks";
import { SkeletonCard } from "@/components/ui/skeleton";

/** Single fetch for month analytics: tilt banner, KPI strip, actionable insights. */
export function DashboardHomeSnapshot() {
  const lang = useAppLanguage();
  const [data, setData] = useState<AnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics?period=month")
      .then((r) => r.json())
      .then((d: AnalyticsDto) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data?.summary) {
    return (
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const s = data.summary;
  const tilt = data.traderBehavior?.contextualTilt;
  const insights = data.actionableInsights ?? [];
  const recap = data.recapSummary;

  const pf =
    s.profitFactor != null && Number.isFinite(s.profitFactor)
      ? s.profitFactor >= 999
        ? "∞"
        : s.profitFactor.toFixed(2)
      : "—";

  return (
    <div className="space-y-8">
      {tilt && <ContextualTiltBanner tilt={tilt} lang={lang} />}

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-400" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {lang === "ru" ? "Месяц в цифрах" : "Month at a glance"}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 ring-1 ring-blue-500/10">
            <p className="text-xs font-medium text-slate-500">
              {lang === "ru" ? "P&L (нетто)" : "Net P&L"}
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {s.totalPnl >= 0 ? "+" : ""}
              {s.totalPnl.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500">
              {lang === "ru" ? "Сделок" : "Trades"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">{s.tradesCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500">
              {lang === "ru" ? "Винрейт" : "Win rate"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">{s.winRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500">
              {lang === "ru" ? "Макс. просадка" : "Max drawdown"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-red-300/90">
              {s.maxDrawdown != null ? s.maxDrawdown.toFixed(2) : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500">
              {lang === "ru" ? "Мат. ожидание" : "Expectancy"}
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                s.expectancy >= 0 ? "text-emerald-400/90" : "text-red-400/90"
              }`}
            >
              {s.expectancy >= 0 ? "+" : ""}
              {s.expectancy.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <p className="text-xs font-medium text-slate-500">Profit factor</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">{pf}</p>
          </div>
        </div>
      </div>

      {recap && <RecapSummaryStrip recap={recap} lang={lang} />}

      <ActionableInsightsList insights={insights} lang={lang} />
    </div>
  );
}
