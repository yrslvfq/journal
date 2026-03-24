"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsDto, AnalyticsPsychDto } from "@/components/analytics/types";
import { useAppLanguage } from "@/lib/app-language";
import { dashboardT, sleepBandLabel, stressLevelLabel } from "@/lib/i18n/dashboard";

export type AnalyticsViewModel = {
  summary: AnalyticsDto["summary"];
  bySymbol: AnalyticsDto["bySymbol"];
  bySetup: AnalyticsDto["bySetup"];
  byConfirmation: AnalyticsDto["byConfirmation"];
  dailyPnl: AnalyticsDto["dailyPnl"];
  cumulativeData: AnalyticsDto["cumulativeData"];
  drawdownData: AnalyticsDto["drawdownData"];
  psych: AnalyticsPsychDto;
  totalTrades: number;
  breakevenCount: number;
  rrEstimate: number | null;
  dayWinRate: number;
  byWeekday: { day: string; count: number; pnl: number; avg: number; winRate: number }[];
  symbolRows: AnalyticsDto["bySymbol"];
  setupRows: AnalyticsDto["bySetup"];
  confirmationRows: AnalyticsDto["byConfirmation"];
  consistencyScore: number;
  activeConsistencyTrend: { label: string; score: number }[];
};

export function OverviewTab({ vm }: { vm: AnalyticsViewModel }) {
  const { summary, bySymbol, dailyPnl } = vm;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi title="Total P&L" value={`${summary.totalPnl >= 0 ? "+" : ""}${summary.totalPnl.toFixed(2)}`} tone={summary.totalPnl >= 0 ? "pos" : "neg"} />
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <p className="text-slate-500 text-sm">Trades</p>
          <p className="text-2xl font-bold text-white mt-1">{summary.tradesCount}</p>
          <p className="text-xs text-slate-500">{summary.wins}W / {summary.losses}L</p>
        </div>
        <Kpi title="Win rate" value={`${summary.winRate.toFixed(1)}%`} />
        <Kpi
          title="Expectancy"
          hint="Average expected result per trade. Positive means the setup has edge."
          value={`${summary.expectancy >= 0 ? "+" : ""}${summary.expectancy.toFixed(2)}`}
          tone={summary.expectancy >= 0 ? "pos" : "neg"}
        />
        <Kpi
          title="Profit factor"
          hint="Gross profit divided by gross loss. Above 1.0 means profitable."
          value={summary.profitFactor != null ? (summary.profitFactor >= 999 ? "∞" : summary.profitFactor.toFixed(2)) : "—"}
        />
        <Kpi
          title="Max drawdown"
          hint="Largest drop from equity peak to next low during selected period."
          value={summary.maxDrawdown != null ? summary.maxDrawdown.toFixed(2) : "—"}
          tone="neg"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">P&L by symbol</h3>
          {bySymbol.length === 0 ? <p className="text-slate-500 text-sm">No data</p> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySymbol.slice(0, 10)} layout="vertical" margin={{ left: 60, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                  <YAxis type="category" dataKey="symbol" stroke="#64748b" tick={{ fill: "#94a3b8" }} width={50} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }} />
                  <Bar dataKey="pnl" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Daily P&L</h3>
          {dailyPnl.length === 0 ? <p className="text-slate-500 text-sm">No data</p> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }} />
                  <Bar dataKey="pnl" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function FunnelTab({ vm }: { vm: AnalyticsViewModel }) {
  const { summary, totalTrades, breakevenCount, setupRows, confirmationRows, rrEstimate } = vm;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-sm font-medium text-slate-400">Trade outcomes</h3>
        <div className="grid grid-cols-3 gap-3">
          <KpiMini title="Wins" value={summary.wins} tone="pos" />
          <KpiMini title="Losses" value={summary.losses} tone="neg" />
          <KpiMini title="Breakeven" value={breakevenCount} />
        </div>
        <p className="mt-4 text-xs text-slate-500">Conversion snapshot: {summary.winRate.toFixed(1)}% over {totalTrades} trades.</p>
      </div>
      <PnlRankChart title="Setup efficiency (top 8)" rows={setupRows.slice(0, 8)} keyName="id" />
      <PnlRankChart title="Confirmation efficiency (top 8)" rows={confirmationRows.slice(0, 8)} keyName="id" />
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-sm font-medium text-slate-400">Funnel health</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p className="flex items-center gap-1">
            Profit factor <InfoHint text="Gross profit divided by gross loss." />:
            <span className="font-semibold text-white">{summary.profitFactor?.toFixed(2) ?? "—"}</span>
          </p>
          <p className="flex items-center gap-1">
            Payoff ratio <InfoHint text="Average win size divided by average loss size." />:
            <span className="font-semibold text-white">{summary.payoffRatio?.toFixed(2) ?? "—"}</span>
          </p>
          <p className="flex items-center gap-1">
            Estimated RR <InfoHint text="Approximate risk-reward ratio estimated from avg win and avg loss." />:
            <span className="font-semibold text-white">{rrEstimate?.toFixed(2) ?? "—"}</span>
          </p>
          <p className="flex items-center gap-1">
            Expectancy <InfoHint text="Expected average result per trade." />:
            <span className={`font-semibold ${summary.expectancy >= 0 ? "text-emerald-400" : "text-red-400"}`}>{summary.expectancy.toFixed(2)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RiskTab({ vm }: { vm: AnalyticsViewModel }) {
  const { summary, drawdownData } = vm;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-sm font-medium text-slate-400">Risk snapshot</h3>
        <div className="grid grid-cols-2 gap-3">
          <KpiMini title="Max drawdown" value={summary.maxDrawdown?.toFixed(2) ?? "—"} tone="neg" />
          <KpiMini title="Total risk" value={summary.totalRisk?.toFixed(2) ?? "—"} />
          <KpiMini title="Recovery factor" value={summary.recoveryFactor?.toFixed(2) ?? "—"} />
          <KpiMini title="Worst loss streak" value={summary.maxLossStreak ?? 0} tone="neg" />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-sm font-medium text-slate-400">Drawdown curve</h3>
        {!drawdownData?.length ? <p className="text-sm text-slate-500">No data</p> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export function SegmentsTab({ vm }: { vm: AnalyticsViewModel }) {
  const { symbolRows, setupRows, confirmationRows, summary } = vm;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-medium text-slate-400">Top symbols by P&L</h3>
        <div className="space-y-2">
          {symbolRows.slice(0, 10).map((row) => (
            <div key={row.symbol} className="flex items-center justify-between rounded-xl bg-slate-800/60 px-3 py-2">
              <p className="text-sm text-slate-200">{row.symbol}</p>
              <p className={`text-sm font-semibold ${row.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {row.pnl >= 0 ? "+" : ""}{row.pnl.toFixed(2)} ({row.count})
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-sm font-medium text-slate-400">Segment quality</h3>
        <p className="text-sm text-slate-300">Best setup: <span className="font-semibold text-white">{setupRows[0]?.name ?? "—"}</span></p>
        <p className="mt-2 text-sm text-slate-300">Best confirmation: <span className="font-semibold text-white">{confirmationRows[0]?.name ?? "—"}</span></p>
        <p className="mt-2 text-sm text-slate-300">Trades/day: <span className="font-semibold text-white">{summary.tradesPerDay?.toFixed(1) ?? "—"}</span></p>
      </div>
    </div>
  );
}

export function TimePatternsTab({ vm }: { vm: AnalyticsViewModel }) {
  const { byWeekday, dayWinRate } = vm;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-sm font-medium text-slate-400">P&L by weekday</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byWeekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
              <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }} />
              <Bar dataKey="pnl">
                {byWeekday.map((row) => <Cell key={row.day} fill={row.pnl >= 0 ? "#22c55e" : "#ef4444"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-sm font-medium text-slate-400">Day consistency</h3>
        <div className="space-y-2">
          {byWeekday.map((row) => (
            <div key={row.day} className="flex items-center justify-between rounded-xl bg-slate-800/60 px-3 py-2 text-sm">
              <span className="text-slate-200">{row.day}</span>
              <span className="text-slate-300">{row.count} trades</span>
              <span className={row.avg >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                {row.avg >= 0 ? "+" : ""}{row.avg.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">Winning days: {dayWinRate.toFixed(1)}%</p>
      </div>
    </div>
  );
}

function fmtSigned2(x: number) {
  return `${x >= 0 ? "+" : ""}${x.toFixed(2)}`;
}

function fmtPerRiskPct(v: number | null) {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

export function PsychTab({ vm }: { vm: AnalyticsViewModel }) {
  const lang = useAppLanguage();
  const pt = dashboardT(lang).psychTab;
  const { psych, summary } = vm;
  const {
    coverage,
    byStress,
    byEnergy,
    bySleepBand,
    byMoodTag,
    insights,
    fragileState,
    stressEnergyGrid,
    segmentHighlights,
  } = psych;

  const stressChart = byStress.filter((r) => r.count > 0);
  const stressChartLabeled = stressChart.map((r) => ({
    ...r,
    xLabel: stressLevelLabel(lang, r.level),
  }));
  const energyChart = byEnergy.filter((r) => r.count > 0);
  const sleepChart = bySleepBand;
  const sleepChartLabeled = sleepChart.map((r) => ({
    ...r,
    xLabel: sleepBandLabel(lang, r.band),
  }));

  const stressMiniRows = stressChart.map((r) => ({
    key: r.level,
    display: stressLevelLabel(lang, r.level),
    count: r.count,
    winRate: r.winRate,
    avgPnl: r.avgPnl,
  }));
  const energyMiniRows = energyChart.map((r) => ({
    key: String(r.energy),
    display: String(r.energy),
    count: r.count,
    winRate: r.winRate,
    avgPnl: r.avgPnl,
  }));
  const sleepMiniRows = sleepChart.map((r) => ({
    key: r.band,
    display: sleepBandLabel(lang, r.band),
    count: r.count,
    winRate: r.winRate,
    avgPnl: r.avgPnl,
  }));

  const hasHighlights =
    segmentHighlights.bestEnergy ||
    segmentHighlights.worstEnergy ||
    segmentHighlights.bestStress ||
    segmentHighlights.worstStress;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{pt.coverageTitle}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {coverage.withAny} / {coverage.total}
          </p>
          <p className="text-sm text-slate-400 mt-1">{pt.coverageSub(coverage.percent)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            {pt.energyWlTitle}
            <InfoHint text={pt.energyWlHint} />
          </p>
          <p className="text-sm text-emerald-400 mt-2">Wins: {insights.avgEnergyWins?.toFixed(2) ?? "—"}</p>
          <p className="text-sm text-red-400">Losses: {insights.avgEnergyLosses?.toFixed(2) ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            {pt.sleepWlTitle}
            <InfoHint text={pt.sleepWlHint} />
          </p>
          <p className="text-sm text-emerald-400 mt-2">
            Wins: {insights.avgSleepWins?.toFixed(2) ?? "—"} {pt.hoursSuffix}
          </p>
          <p className="text-sm text-red-400">
            Losses: {insights.avgSleepLosses?.toFixed(2) ?? "—"} {pt.hoursSuffix}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
          <p className="text-xs text-slate-500">{pt.winRatePeriod}</p>
          <p className="text-2xl font-bold text-white mt-1">{summary.winRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">{pt.winRateCompare}</p>
        </div>
      </div>

      {coverage.total > 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 mb-3">{pt.coverageFieldsTitle}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-slate-500">{pt.fieldEnergy}</p>
              <p className="text-sm font-medium text-white mt-0.5">
                {pt.fieldFilled(coverage.byField.energy.percent, coverage.byField.energy.count)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{pt.fieldSleep}</p>
              <p className="text-sm font-medium text-white mt-0.5">
                {pt.fieldFilled(coverage.byField.sleep.percent, coverage.byField.sleep.count)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{pt.fieldStress}</p>
              <p className="text-sm font-medium text-white mt-0.5">
                {pt.fieldFilled(coverage.byField.stress.percent, coverage.byField.stress.count)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{pt.fieldMood}</p>
              <p className="text-sm font-medium text-white mt-0.5">
                {pt.fieldFilled(coverage.byField.mood.percent, coverage.byField.mood.count)}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {coverage.withAny === 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-8 text-center text-slate-300">
          <p className="font-medium text-amber-200/90">{pt.emptyTitle}</p>
          <p className="text-sm text-slate-500 mt-2">{pt.emptyHint}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {pt.stressIndexTitle}
                <InfoHint text={pt.stressIndexHint} />
              </p>
              <p className="text-sm text-emerald-400 mt-2">
                {pt.stressWinsLabel}: {insights.avgStressIndexWins?.toFixed(2) ?? "—"}
              </p>
              <p className="text-sm text-red-400">
                {pt.stressLossesLabel}: {insights.avgStressIndexLosses?.toFixed(2) ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {pt.fragileTitle}
                <InfoHint text={pt.fragileHint} />
              </p>
              <p className="text-lg font-semibold text-white mt-2">{pt.fragileN(fragileState.count)}</p>
              <p className="text-sm text-slate-400 mt-1">{pt.fragileWr(fragileState.winRate)}</p>
              <p
                className={`text-sm font-medium mt-1 ${fragileState.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {pt.fragileAvg(fmtSigned2(fragileState.avgPnl))}
              </p>
              <p className="text-xs text-slate-500 mt-1">{pt.fragilePerRisk(fmtPerRiskPct(fragileState.expectancyPerRisk))}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {pt.highlightsTitle}
                <InfoHint text={pt.highlightsHint} />
              </p>
              {hasHighlights ? (
                <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                  {segmentHighlights.bestEnergy ? (
                    <li>
                      {pt.highlightBestEnergy(
                        segmentHighlights.bestEnergy.energy,
                        fmtSigned2(segmentHighlights.bestEnergy.avgPnl),
                        segmentHighlights.bestEnergy.count
                      )}
                    </li>
                  ) : null}
                  {segmentHighlights.worstEnergy ? (
                    <li>
                      {pt.highlightWorstEnergy(
                        segmentHighlights.worstEnergy.energy,
                        fmtSigned2(segmentHighlights.worstEnergy.avgPnl),
                        segmentHighlights.worstEnergy.count
                      )}
                    </li>
                  ) : null}
                  {segmentHighlights.bestStress ? (
                    <li>
                      {pt.highlightBestStress(
                        stressLevelLabel(lang, segmentHighlights.bestStress.level),
                        fmtSigned2(segmentHighlights.bestStress.avgPnl),
                        segmentHighlights.bestStress.count
                      )}
                    </li>
                  ) : null}
                  {segmentHighlights.worstStress ? (
                    <li>
                      {pt.highlightWorstStress(
                        stressLevelLabel(lang, segmentHighlights.worstStress.level),
                        fmtSigned2(segmentHighlights.worstStress.avgPnl),
                        segmentHighlights.worstStress.count
                      )}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 mt-2">{pt.highlightsEmpty}</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-400">{pt.chartStress}</h3>
              {stressChart.length === 0 ? (
                <p className="text-sm text-slate-500">{pt.noStress}</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stressChartLabeled}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="xLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }}
                      />
                      <Bar dataKey="avgPnl" name="avgPnl" radius={[6, 6, 0, 0]}>
                        {stressChartLabeled.map((row) => (
                          <Cell key={row.level} fill={row.avgPnl >= 0 ? "#22c55e" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <PsychMiniTable rows={stressMiniRows} formatMini={pt.miniRow} />
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-400">{pt.chartEnergy}</h3>
              {energyChart.length === 0 ? (
                <p className="text-sm text-slate-500">{pt.noEnergy}</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={energyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="energy" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                      <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }}
                      />
                      <Bar dataKey="avgPnl" radius={[6, 6, 0, 0]}>
                        {energyChart.map((row) => (
                          <Cell key={row.energy} fill={row.avgPnl >= 0 ? "#38bdf8" : "#f97316"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <PsychMiniTable rows={energyMiniRows} formatMini={pt.miniRow} />
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <h3 className="mb-3 text-sm font-medium text-slate-400">{pt.chartSleep}</h3>
              {sleepChart.length === 0 ? (
                <p className="text-sm text-slate-500">{pt.noSleep}</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sleepChartLabeled}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="xLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }}
                      />
                      <Bar dataKey="avgPnl" radius={[6, 6, 0, 0]}>
                        {sleepChartLabeled.map((row) => (
                          <Cell key={row.band} fill={row.avgPnl >= 0 ? "#a78bfa" : "#fb7185"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <PsychMiniTable rows={sleepMiniRows} formatMini={pt.miniRow} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
            <h3 className="mb-1 text-sm font-medium text-slate-400 flex items-center gap-1">
              {pt.gridTitle}
              <InfoHint text={pt.gridHint} />
            </h3>
            {stressEnergyGrid.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">{pt.gridEmpty}</p>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-800">
                      <th className="pb-2 pr-4 font-medium">{pt.gridColStress}</th>
                      <th className="pb-2 pr-4 font-medium">{pt.gridColEnergy}</th>
                      <th className="pb-2 pr-4 font-medium">{pt.colN}</th>
                      <th className="pb-2 pr-4 font-medium">{pt.colWr}</th>
                      <th className="pb-2 pr-4 font-medium">{pt.colAvgPnl}</th>
                      <th className="pb-2 font-medium flex items-center gap-1">
                        {pt.colPerRisk}
                        <InfoHint text={pt.perRiskHint} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stressEnergyGrid.map((row) => (
                      <tr key={`${row.stressLevel}-${row.energy}`} className="border-b border-slate-800/60">
                        <td className="py-2 pr-4 text-slate-200">{stressLevelLabel(lang, row.stressLevel)}</td>
                        <td className="py-2 pr-4 text-slate-300">{row.energy}</td>
                        <td className="py-2 pr-4 text-slate-300">{row.count}</td>
                        <td className="py-2 pr-4 text-slate-300">{row.winRate.toFixed(1)}%</td>
                        <td className={`py-2 pr-4 font-medium ${row.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmtSigned2(row.avgPnl)}
                        </td>
                        <td className="py-2 text-slate-300">{fmtPerRiskPct(row.expectancyPerRisk)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
            <h3 className="mb-3 text-sm font-medium text-slate-400">{pt.moodTitle}</h3>
            {byMoodTag.length === 0 ? (
              <p className="text-sm text-slate-500">{pt.noMood}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-800">
                      <th className="pb-2 pr-4 font-medium">{pt.colTag}</th>
                      <th className="pb-2 pr-4 font-medium">{pt.colN}</th>
                      <th className="pb-2 pr-4 font-medium">{pt.colWr}</th>
                      <th className="pb-2 pr-4 font-medium">{pt.colSumPnl}</th>
                      <th className="pb-2 pr-4 font-medium">{pt.colAvgPnl}</th>
                      <th className="pb-2 font-medium">
                        <span className="inline-flex items-center gap-1">
                          {pt.colPerRisk}
                          <InfoHint text={pt.perRiskHint} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMoodTag.map((row) => (
                      <tr key={row.tag} className="border-b border-slate-800/60">
                        <td className="py-2 pr-4 text-violet-300 font-medium">{row.tag}</td>
                        <td className="py-2 pr-4 text-slate-300">{row.count}</td>
                        <td className="py-2 pr-4 text-slate-300">{row.winRate.toFixed(1)}%</td>
                        <td
                          className={`py-2 pr-4 font-medium ${row.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {row.totalPnl >= 0 ? "+" : ""}
                          {row.totalPnl.toFixed(2)}
                        </td>
                        <td className={`py-2 pr-4 font-medium ${row.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {row.avgPnl >= 0 ? "+" : ""}
                          {row.avgPnl.toFixed(2)}
                        </td>
                        <td className="py-2 text-slate-300">{fmtPerRiskPct(row.expectancyPerRisk)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PsychMiniTable({
  rows,
  formatMini,
}: {
  rows: { key: string; display: string; count: number; winRate: number; avgPnl: number }[];
  formatMini: (n: number, wr: number, avg: string) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 space-y-1.5 text-xs text-slate-400">
      {rows.map((row) => {
        const avgStr = `${row.avgPnl >= 0 ? "+" : ""}${row.avgPnl.toFixed(2)}`;
        return (
          <div key={row.key} className="flex justify-between gap-2">
            <span className="text-slate-300">{row.display}</span>
            <span className="text-right">
              {formatMini(row.count, Math.round(row.winRate), avgStr)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function QualityTab({ vm }: { vm: AnalyticsViewModel }) {
  const { consistencyScore, activeConsistencyTrend } = vm;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
          <h3 className="mb-3 text-sm font-medium text-slate-400 flex items-center gap-1">
            Execution quality score
            <InfoHint text="Composite score from win rate, profit factor, and discipline proxy." />
          </h3>
        <p className="text-4xl font-bold text-white">{consistencyScore.toFixed(0)} / 100</p>
        <p className="mt-2 text-xs text-slate-500">Built from win rate, profit factor and loss-streak discipline.</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${consistencyScore}%` }} />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
          <h3 className="mb-3 text-sm font-medium text-slate-400 flex items-center gap-1">
            Quality pillars
            <InfoHint text="Sub-scores that contribute to the execution quality score." />
          </h3>
        <div className="space-y-3">
          {activeConsistencyTrend.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span>{item.label}</span><span>{item.score}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PnlRankChart({ title, rows, keyName }: { title: string; rows: { id?: string; name: string; pnl: number }[]; keyName: "id" | "name" }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
      <h3 className="mb-3 text-sm font-medium text-slate-400">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 80, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
            <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} width={76} />
            <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }} />
            <Bar dataKey="pnl">
              {rows.map((item) => <Cell key={keyName === "id" ? item.id : item.name} fill={item.pnl >= 0 ? "#22c55e" : "#ef4444"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  tone = "default",
  hint,
}: {
  title: string;
  value: string;
  tone?: "default" | "pos" | "neg";
  hint?: string;
}) {
  const color = tone === "pos" ? "text-emerald-400" : tone === "neg" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
      <p className="text-slate-500 text-sm flex items-center gap-1">
        {title}
        {hint ? <InfoHint text={hint} /> : null}
      </p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function KpiMini({ title, value, tone = "default" }: { title: string; value: string | number; tone?: "default" | "pos" | "neg" }) {
  const color = tone === "pos" ? "text-emerald-400" : tone === "neg" ? "text-red-400" : "text-slate-200";
  return (
    <div className="rounded-xl bg-slate-800/70 p-4">
      <p className="text-xs text-slate-400">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-600 text-[10px] font-bold text-slate-300"
        aria-label={text}
      >
        i
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-normal leading-4 text-slate-200 shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}
