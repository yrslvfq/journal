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
}: {
  label: string;
  sub?: string;
  utilization: number;
  usedLabel: string;
  limitLabel: string;
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
      <p className="text-xs text-slate-500">
        Использование лимита: {pct.toFixed(1)}%
      </p>
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
      toast.error(j.error || "Failed to load");
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
  }, [day]);

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
      toast.error(j.error || "Save failed");
      return;
    }
    toast.success("Сохранено");
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
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">Prop Guard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Контроль дневного лимита и trailing drawdown относительно пика счёта.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">День (UTC)</label>
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
        <h2 className="text-sm font-semibold text-white">Параметры аккаунта</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Starting balance ($)</label>
            <input
              value={form.startingBalance}
              onChange={(e) => setForm((f) => ({ ...f, startingBalance: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Max daily loss (%)</label>
            <input
              value={form.maxDailyLossPercent}
              onChange={(e) => setForm((f) => ({ ...f, maxDailyLossPercent: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Max daily loss ($ cap, optional)</label>
            <input
              value={form.maxDailyLossUsd}
              onChange={(e) => setForm((f) => ({ ...f, maxDailyLossUsd: e.target.value }))}
              placeholder="Пусто = только %"
              className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Max trailing DD (% от пика)</label>
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
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        {!data?.configured && (
          <p className="text-xs text-amber-500/90">
            Параметры ещё не сохранялись в базе — отображаются расчёты с подставленными значениями формы.
          </p>
        )}
      </form>

      {loading || !data ? (
        <p className="text-slate-500">Загрузка…</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Текущий баланс</p>
              <p className="text-2xl font-semibold text-white tabular-nums">
                ${data.currentBalance.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">P&amp;L за выбранный день</p>
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
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Distance to liquidation
              </p>
              <p className="text-2xl font-semibold text-amber-400 tabular-nums">
                ${data.metrics.distanceToLiquidationUsd.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Мин. из остатка по дневке и trailing.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-8">
            <RiskBar
              label="Дневной лимит убытка"
              sub="Считается от убытка за выбранный календарный день (UTC)."
              utilization={data.metrics.dailyUtilization}
              usedLabel={`$${data.metrics.dailyLossUsedUsd.toFixed(2)}`}
              limitLabel={`$${data.metrics.dailyLossLimitUsd.toFixed(2)}`}
            />
            <RiskBar
              label="Trailing drawdown от пика"
              sub={`Пик эквити: $${Math.max(data.settings?.peakBalance ?? 0, data.currentBalance).toFixed(2)}`}
              utilization={data.metrics.trailingUtilization}
              usedLabel={`$${data.metrics.trailingDrawdownUsd.toFixed(2)}`}
              limitLabel={`$${data.metrics.trailingLimitUsd.toFixed(2)}`}
            />
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-sm font-semibold text-white">Кривая эквити</h2>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={whatIf}
                  onChange={(e) => setWhatIf(e.target.checked)}
                  className="rounded border-slate-600"
                />
                What if: без 3 самых прибыльных сделок
              </label>
            </div>
            {series.length === 0 ? (
              <p className="text-slate-500 text-sm">Нет сделок для графика.</p>
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
                      formatter={(v: number) => [`$${v.toFixed(2)}`, whatIf ? "Equity (clean)" : "Equity"]}
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
