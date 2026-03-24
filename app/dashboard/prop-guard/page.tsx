"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { utilizationSeverity } from "@/lib/prop-guard";
import { useAppLanguage } from "@/lib/app-language";
import { dashboardT } from "@/lib/i18n/dashboard";

type Metrics = {
  distanceToLiquidationUsd: number;
  dailyLossUsedUsd: number;
  dailyLossLimitUsd: number;
  dailyUtilization: number;
  trailingDrawdownUsd: number;
  trailingLimitUsd: number;
  trailingUtilization: number;
};

type CurvePoint = { id: string; date: string; netPnl: number; equity: number };

type ApiPayload = {
  configured: boolean;
  settings: {
    startingBalance: number;
    maxDailyLossPercent: number;
    maxDailyLossUsd: number | null;
    maxTrailingDrawdownPercent: number;
    peakBalance: number;
  } | null;
  currentBalance: number;
  todayNetPnl: number;
  day: string;
  metrics: Metrics;
  equityCurve: CurvePoint[];
};

function barClass(util: number): string {
  const s = utilizationSeverity(util);
  if (s === "critical") return "bg-red-500 prop-guard-blink";
  if (s === "warn") return "bg-orange-500";
  return "bg-emerald-500/90";
}

function RiskBar({
  label,
  sub,
  utilization,
  usedLabel,
  limitLabel,
  formatLimitUse,
}: {
  label: string;
  sub?: string;
  utilization: number;
  usedLabel: string;
  limitLabel: string;
  formatLimitUse: (pct: string) => string;
}) {
  const pct = Math.min(100, utilization * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-4 text-sm">
        <div>
          <p className="font-medium text-white">{label}</p>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
        <p className="text-slate-400 text-right tabular-nums">
          {usedLabel}
          <span className="text-slate-600"> / </span>
          {limitLabel}
        </p>
      </div>
      <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/80">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass(utilization)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{formatLimitUse(pct.toFixed(1))}</p>
    </div>
  );
}

function buildCurveWithoutTopWins(start: number, points: CurvePoint[], n: number) {
  const wins = points.filter((p) => p.netPnl > 0).sort((a, b) => b.netPnl - a.netPnl);
  const drop = new Set(wins.slice(0, n).map((p) => p.id));
  let eq = start;
  return points.map((p, i) => {
    if (!drop.has(p.id)) eq += p.netPnl;
    return {
      i,
      label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      equity: p.equity,
      equityClean: eq,
    };
  });
}

export default function PropGuardPage() {
  const lang = useAppLanguage();
  const pg = dashboardT(lang).propGuard;
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatIf, setWhatIf] = useState(false);
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({
    startingBalance: "50000",
    maxDailyLossPercent: "5",
    maxDailyLossUsd: "",
    maxTrailingDrawdownPercent: "10",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/prop-account?day=${encodeURIComponent(day)}`);
    const j = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(j.error || pg.loadErr);
      return;
    }
    setData(j);
    if (j.settings) {
      setForm({
        startingBalance: String(j.settings.startingBalance),
        maxDailyLossPercent: String(j.settings.maxDailyLossPercent),
        maxDailyLossUsd: j.settings.maxDailyLossUsd != null ? String(j.settings.maxDailyLossUsd) : "",
        maxTrailingDrawdownPercent: String(j.settings.maxTrailingDrawdownPercent),
      });
    }
  }, [day, lang]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const maxUsdRaw = form.maxDailyLossUsd.trim();
    const body = {
      startingBalance: parseFloat(form.startingBalance),
      maxDailyLossPercent: parseFloat(form.maxDailyLossPercent),
      maxDailyLossUsd: maxUsdRaw === "" ? null : parseFloat(maxUsdRaw),
      maxTrailingDrawdownPercent: parseFloat(form.maxTrailingDrawdownPercent),
    };
    const res = await fetch("/api/prop-account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(j.error || pg.saveFailed);
      return;
    }
    toast.success(pg.saved);
    load();
  }

  const series = useMemo(() => {
    if (!data?.equityCurve?.length) return [];
    const s0 =
      data.settings?.startingBalance ||
      (Number.isFinite(parseFloat(form.startingBalance)) ? parseFloat(form.startingBalance) : 50_000);
    const cleaned = buildCurveWithoutTopWins(s0, data.equityCurve, 3);
    return data.equityCurve.map((p, i) => ({
      i,
      label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      equity: p.equity,
      equityClean: cleaned[i].equityClean,
      show: whatIf ? cleaned[i].equityClean : p.equity,
    }));
  }, [data, whatIf, form.startingBalance]);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-slate-500 hover:text-white transition text-sm">
            {pg.backDash}
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">Prop Guard</h1>
          <p className="text-slate-500 text-sm mt-1">{pg.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">{pg.dayUtc}</label>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
          />
        </div>
      </div>

      <form
        onSubmit={saveSettings}
        className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-white">{pg.accountParams}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">{pg.startingBalance}</label>
            <input
              value={form.startingBalance}
              onChange={(e) => setForm((f) => ({ ...f, startingBalance: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{pg.maxDailyPct}</label>
            <input
              value={form.maxDailyLossPercent}
              onChange={(e) => setForm((f) => ({ ...f, maxDailyLossPercent: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{pg.maxDailyUsd}</label>
            <input
              value={form.maxDailyLossUsd}
              onChange={(e) => setForm((f) => ({ ...f, maxDailyLossUsd: e.target.value }))}
              placeholder={pg.maxDailyUsdPh}
              className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{pg.maxTrail}</label>
            <input
              value={form.maxTrailingDrawdownPercent}
              onChange={(e) => setForm((f) => ({ ...f, maxTrailingDrawdownPercent: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? pg.saving : pg.save}
        </button>
        {!data?.configured && (
          <p className="text-xs text-amber-500/90">{pg.notSavedHint}</p>
        )}
      </form>

      {loading || !data ? (
        <p className="text-slate-500">{pg.loading}</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{pg.balance}</p>
              <p className="text-2xl font-semibold text-white tabular-nums">
                ${data.currentBalance.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{pg.dayPnl}</p>
              <p
                className={`text-2xl font-semibold tabular-nums ${
                  data.todayNetPnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {data.todayNetPnl >= 0 ? "+" : ""}
                {data.todayNetPnl.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{pg.distLiq}</p>
              <p className="text-2xl font-semibold text-amber-400 tabular-nums">
                ${data.metrics.distanceToLiquidationUsd.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{pg.distLiqHint}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-8">
            <RiskBar
              label={pg.dailyBar}
              sub={pg.dailyBarSub}
              utilization={data.metrics.dailyUtilization}
              usedLabel={`$${data.metrics.dailyLossUsedUsd.toFixed(2)}`}
              limitLabel={`$${data.metrics.dailyLossLimitUsd.toFixed(2)}`}
              formatLimitUse={pg.utilization}
            />
            <RiskBar
              label={pg.trailBar}
              sub={pg.trailBarSub(
                Math.max(data.settings?.peakBalance ?? 0, data.currentBalance).toFixed(2)
              )}
              utilization={data.metrics.trailingUtilization}
              usedLabel={`$${data.metrics.trailingDrawdownUsd.toFixed(2)}`}
              limitLabel={`$${data.metrics.trailingLimitUsd.toFixed(2)}`}
              formatLimitUse={pg.utilization}
            />
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-sm font-semibold text-white">{pg.equityCurve}</h2>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={whatIf}
                  onChange={(e) => setWhatIf(e.target.checked)}
                  className="rounded border-slate-600"
                />
                {pg.whatIf}
              </label>
            </div>
            {series.length === 0 ? (
              <p className="text-slate-500 text-sm">{pg.noCurve}</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                      formatter={(v: number) => [
                        `$${v.toFixed(2)}`,
                        whatIf ? pg.chartTooltipEquityClean : pg.chartTooltipEquity,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="show"
                      stroke={whatIf ? "#f97316" : "#38bdf8"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
