"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { AnalyticsHubTabs } from "@/components/analytics/hub-tabs";
import { AnalyticsPeriodFilters } from "@/components/analytics/period-filters";
import { AnalyticsTabPlaceholder } from "@/components/analytics/tab-placeholder";
import { SkeletonCard, SkeletonChart } from "@/components/ui/skeleton";
import { AnalyticsDto, AnalyticsPeriod, AnalyticsTabId } from "@/components/analytics/types";

const HUB_TABS: { id: AnalyticsTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "funnel", label: "Funnel" },
  { id: "risk", label: "Risk" },
  { id: "segments", label: "Segments" },
  { id: "time-patterns", label: "Time Patterns" },
  { id: "quality", label: "Quality" },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const tabParam = searchParams.get("tab");
  const activeTab: AnalyticsTabId = HUB_TABS.some((t) => t.id === tabParam)
    ? (tabParam as AnalyticsTabId)
    : "overview";

  const canFetch = period !== "custom" || (!!dateFrom && !!dateTo);
  const exportHref = `/api/analytics/export?period=${period}${
    period === "custom" && dateFrom && dateTo ? `&dateFrom=${dateFrom}&dateTo=${dateTo}` : ""
  }`;

  const handleTabChange = (tab: AnalyticsTabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/dashboard/analytics?${params.toString()}`);
  };

  useEffect(() => {
    if (!canFetch) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    params.set("period", period);
    if (period === "custom" && dateFrom && dateTo) {
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
    }
    fetch(`/api/analytics?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period, dateFrom, dateTo, canFetch]);

  if (loading && canFetch) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Analytics Hub</h1>
        <AnalyticsPeriodFilters
          period={period}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPeriodChange={setPeriod}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          exportHref={exportHref}
          canFetch={canFetch}
        />
        <AnalyticsHubTabs tabs={HUB_TABS} activeTab={activeTab} onChange={handleTabChange} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonChart height={256} />
          <SkeletonChart height={256} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonChart height={288} />
          <SkeletonChart height={288} />
        </div>
      </div>
    );
  }

  if (period === "custom" && !canFetch) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Analytics Hub</h1>
        <AnalyticsPeriodFilters
          period={period}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPeriodChange={setPeriod}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          exportHref={exportHref}
          canFetch={canFetch}
        />
        <AnalyticsHubTabs tabs={HUB_TABS} activeTab={activeTab} onChange={handleTabChange} />
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-12 text-center text-slate-500">
          Select date range to view analytics
        </div>
      </div>
    );
  }

  if (activeTab !== "overview") {
    const tabDescriptions: Record<Exclude<AnalyticsTabId, "overview">, string> = {
      funnel: "Conversion-focused metrics and setup/confirmation efficiency will be placed here.",
      risk: "Drawdown, limit breaches, and streak-risk controls will be placed here.",
      segments: "Segment-level performance by symbol, market condition, and tags will be placed here.",
      "time-patterns": "Day-of-week, hour, and session behavior analysis will be placed here.",
      quality: "Execution quality and discipline indicators will be placed here.",
    };
    const tabLabel = HUB_TABS.find((tab) => tab.id === activeTab)?.label ?? "Tab";
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Analytics Hub</h1>
        <AnalyticsPeriodFilters
          period={period}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPeriodChange={setPeriod}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          exportHref={exportHref}
          canFetch={canFetch}
        />
        <AnalyticsHubTabs tabs={HUB_TABS} activeTab={activeTab} onChange={handleTabChange} />
        <AnalyticsTabPlaceholder title={tabLabel} description={tabDescriptions[activeTab]} />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, bySymbol, bySetup, byConfirmation, dailyPnl, cumulativeData, drawdownData } = data;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Analytics Hub</h1>
      <AnalyticsPeriodFilters
        period={period}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPeriodChange={setPeriod}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        exportHref={exportHref}
        canFetch={canFetch}
      />
      <AnalyticsHubTabs tabs={HUB_TABS} activeTab={activeTab} onChange={handleTabChange} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <p className="text-slate-500 text-sm">Total P&L</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              summary.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {summary.totalPnl >= 0 ? "+" : ""}
            {summary.totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <p className="text-slate-500 text-sm">Trades</p>
          <p className="text-2xl font-bold text-white mt-1">
            {summary.tradesCount}
          </p>
          <p className="text-xs text-slate-500">
            {summary.wins}W / {summary.losses}L
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <p className="text-slate-500 text-sm">Win rate</p>
          <p className="text-2xl font-bold text-white mt-1">
            {summary.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <p className="text-slate-500 text-sm">Expectancy</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              summary.expectancy >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {summary.expectancy >= 0 ? "+" : ""}
            {summary.expectancy.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <p className="text-slate-500 text-sm">Profit factor</p>
          <p className="text-2xl font-bold text-white mt-1">
            {summary.profitFactor != null
              ? summary.profitFactor >= 999
                ? "∞"
                : summary.profitFactor.toFixed(2)
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <p className="text-slate-500 text-sm">Max drawdown</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {summary.maxDrawdown != null ? summary.maxDrawdown.toFixed(2) : "—"}
          </p>
        </div>
      </div>

      {/* Professional risk & performance metrics */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Performance & risk metrics</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <p className="text-slate-500 text-xs">Avg trade</p>
            <p
              className={`text-lg font-semibold mt-0.5 ${
                (summary.avgTrade ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {summary.avgTrade != null ? `${(summary.avgTrade >= 0 ? "+" : "")}${summary.avgTrade.toFixed(2)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Median trade</p>
            <p
              className={`text-lg font-semibold mt-0.5 ${
                (summary.medianTrade ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {summary.medianTrade != null ? `${(summary.medianTrade >= 0 ? "+" : "")}${summary.medianTrade.toFixed(2)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Std dev (volatility)</p>
            <p className="text-lg font-semibold text-white mt-0.5">
              {summary.stdDevPnl != null ? summary.stdDevPnl.toFixed(2) : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Sharpe ratio</p>
            <p className="text-lg font-semibold text-white mt-0.5">
              {summary.sharpeRatio != null ? summary.sharpeRatio.toFixed(2) : "—"}
            </p>
            <p className="text-[10px] text-slate-500">higher = better risk-adjusted</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Payoff ratio</p>
            <p className="text-lg font-semibold text-white mt-0.5">
              {summary.payoffRatio != null
                ? summary.payoffRatio >= 999
                  ? "∞"
                  : summary.payoffRatio.toFixed(2)
                : "—"}
            </p>
            <p className="text-[10px] text-slate-500">avg win / avg loss</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Recovery factor</p>
            <p className="text-lg font-semibold text-white mt-0.5">
              {summary.recoveryFactor != null
                ? summary.recoveryFactor >= 999
                  ? "∞"
                  : summary.recoveryFactor.toFixed(2)
                : "—"}
            </p>
            <p className="text-[10px] text-slate-500">profit / max drawdown</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Calmar ratio</p>
            <p className="text-lg font-semibold text-white mt-0.5">
              {summary.calmarRatio != null
                ? summary.calmarRatio >= 999
                  ? "∞"
                  : summary.calmarRatio.toFixed(2)
                : "—"}
            </p>
            <p className="text-[10px] text-slate-500">return / max drawdown</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Best trade</p>
            <p className="text-lg font-semibold text-emerald-400 mt-0.5">
              {summary.bestTrade != null ? `+${summary.bestTrade.toFixed(2)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Worst trade</p>
            <p className="text-lg font-semibold text-red-400 mt-0.5">
              {summary.worstTrade != null ? summary.worstTrade.toFixed(2) : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Expectancy / $ risked</p>
            <p
              className={`text-lg font-semibold mt-0.5 ${
                (summary.expectancyPerRisk ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {summary.expectancyPerRisk != null ? `${(summary.expectancyPerRisk >= 0 ? "+" : "")}${(summary.expectancyPerRisk * 100).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Total risk</p>
            <p className="text-lg font-semibold text-white mt-0.5">
              {summary.totalRisk != null ? summary.totalRisk.toFixed(2) : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Trades / day</p>
            <p className="text-lg font-semibold text-white mt-0.5">
              {summary.tradesPerDay != null ? summary.tradesPerDay.toFixed(1) : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Breakeven</p>
            <p className="text-lg font-semibold text-slate-400 mt-0.5">
              {summary.breakevenCount ?? 0}
            </p>
          </div>
        </div>
      </div>

      {(summary.currentWinStreak !== undefined ||
        summary.currentLossStreak !== undefined ||
        (summary.maxWinStreak ?? 0) > 0 ||
        (summary.maxLossStreak ?? 0) > 0) && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Streaks</h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-slate-500 text-xs">Current win</span>
              <p className="text-emerald-400 font-semibold">
                {summary.currentWinStreak ?? 0}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Current loss</span>
              <p className="text-red-400 font-semibold">
                {summary.currentLossStreak ?? 0}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Best win streak</span>
              <p className="text-white font-semibold">
                {summary.maxWinStreak ?? 0}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Worst loss streak</span>
              <p className="text-white font-semibold">
                {summary.maxLossStreak ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">
            P&L by symbol
          </h3>
          {bySymbol.length === 0 ? (
            <p className="text-slate-500 text-sm">No data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bySymbol.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8" }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Bar
                    dataKey="pnl"
                    fill="#3b82f6"
                    radius={[0, 6, 6, 0]}
                    name="P&L"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">
            P&L by Setup
          </h3>
          {bySetup.length === 0 ? (
            <p className="text-slate-500 text-sm">No data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bySetup.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    width={75}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="pnl" fill="#3b82f6" radius={[0, 6, 6, 0]} name="P&L" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">
            P&L by Confirmation
          </h3>
          {byConfirmation.length === 0 ? (
            <p className="text-slate-500 text-sm">No data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byConfirmation.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    width={75}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="pnl" fill="#34d399" radius={[0, 6, 6, 0]} name="P&L" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">
            Daily P&L
          </h3>
          {dailyPnl.length === 0 ? (
            <p className="text-slate-500 text-sm">No data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnl} margin={{ top: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar
                    dataKey="pnl"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    name="P&L"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">
            Cumulative P&L curve
          </h3>
          {cumulativeData.length === 0 ? (
            <p className="text-slate-500 text-sm">No data</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData} margin={{ top: 20, right: 20 }}>
                  <defs>
                    <linearGradient
                      id="cumulativeGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#cumulativeGrad)"
                    name="Cumulative P&L"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">
            Drawdown
          </h3>
          {!drawdownData?.length ? (
            <p className="text-slate-500 text-sm">No data</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownData} margin={{ top: 20, right: 20 }}>
                  <defs>
                    <linearGradient
                      id="drawdownGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#drawdownGrad)"
                    name="Drawdown"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
