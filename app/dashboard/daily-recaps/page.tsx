"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { sessionPersonaIcon } from "@/components/analytics/behavior-tab";
import { disciplineScoreFromChecklist } from "@/lib/analytics-advanced";
import { useAppLanguage } from "@/lib/app-language";
import { dashboardT } from "@/lib/i18n/dashboard";

function localIsoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type RecapRow = {
  id: string;
  date: string;
  keptLossLimit: boolean;
  setupsOnly: boolean;
  noStopMoving: boolean;
  disciplineScore: number;
  lessonOfDay: string;
  sessionStatus: string | null;
  sessionEfficiency: number | null;
};

type SessionMetrics = {
  tradesCount: number;
  netPnl: number;
  totalFees: number;
  efficiencyPerFeeUsd: number | null;
  efficiencyUserFormula: number | null;
  persona: string;
  efficiencyScore: number;
};

function personaLabel(
  persona: string,
  t: ReturnType<typeof dashboardT>["dailyRecap"]
) {
  switch (persona) {
    case "sniper":
      return t.personaSniper;
    case "machine_gunner":
      return t.personaMachine;
    case "brokers_best_friend":
      return t.personaBroker;
    default:
      return t.personaBalanced;
  }
}

export default function DailyRecapsPage() {
  const language = useAppLanguage();
  const t = dashboardT(language).dailyRecap;
  const [selectedDate, setSelectedDate] = useState(localIsoDate);
  const [keptLossLimit, setKeptLossLimit] = useState(false);
  const [setupsOnly, setSetupsOnly] = useState(false);
  const [noStopMoving, setNoStopMoving] = useState(false);
  const [madePlan, setMadePlan] = useState(false);
  const [followedPlan, setFollowedPlan] = useState(false);
  const [preMarketJournal, setPreMarketJournal] = useState(false);
  const [keptMaxTrades, setKeptMaxTrades] = useState(false);
  const [keptRiskRules, setKeptRiskRules] = useState(false);
  const [lessonOfDay, setLessonOfDay] = useState("");
  const [dayPnl, setDayPnl] = useState<number | null>(null);
  const [tradesCount, setTradesCount] = useState(0);
  const [dayWins, setDayWins] = useState(0);
  const [dayLosses, setDayLosses] = useState(0);
  const [dayBreakeven, setDayBreakeven] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [list, setList] = useState<RecapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);

  const disciplineScore = useMemo(
    () =>
      disciplineScoreFromChecklist(
        keptLossLimit,
        setupsOnly,
        noStopMoving,
        madePlan,
        followedPlan,
        preMarketJournal,
        keptMaxTrades,
        keptRiskRules
      ),
    [
      keptLossLimit,
      setupsOnly,
      noStopMoving,
      madePlan,
      followedPlan,
      preMarketJournal,
      keptMaxTrades,
      keptRiskRules,
    ]
  );

  const applyDayPayload = useCallback((data: Record<string, unknown>) => {
    setDayPnl((data.dayPnl as number) ?? 0);
    setTradesCount((data.tradesCount as number) ?? 0);
    setDayWins((data.dayWins as number) ?? 0);
    setDayLosses((data.dayLosses as number) ?? 0);
    setDayBreakeven((data.dayBreakeven as number) ?? 0);
    setTotalFees((data.totalFees as number) ?? 0);
    setSessionMetrics((data.sessionMetrics as SessionMetrics) ?? null);
  }, []);

  const loadDay = useCallback(
    async (iso: string) => {
      setLoading(true);
      try {
        const r = await fetch(`/api/daily-recaps/${iso}`);
        if (!r.ok) throw new Error("Failed to load");
        const data = await r.json();
        applyDayPayload(data);
        if (data.recap) {
          setKeptLossLimit(!!data.recap.keptLossLimit);
          setSetupsOnly(!!data.recap.setupsOnly);
          setNoStopMoving(!!data.recap.noStopMoving);
          setMadePlan(!!data.recap.madePlan);
          setFollowedPlan(!!data.recap.followedPlan);
          setPreMarketJournal(!!data.recap.preMarketJournal);
          setKeptMaxTrades(!!data.recap.keptMaxTrades);
          setKeptRiskRules(!!data.recap.keptRiskRules);
          setLessonOfDay(data.recap.lessonOfDay ?? "");
        } else {
          setKeptLossLimit(false);
          setSetupsOnly(false);
          setNoStopMoving(false);
          setMadePlan(false);
          setFollowedPlan(false);
          setPreMarketJournal(false);
          setKeptMaxTrades(false);
          setKeptRiskRules(false);
          setLessonOfDay("");
        }
      } catch {
        toast.error(t.loadErr);
      } finally {
        setLoading(false);
      }
    },
    [applyDayPayload, t.loadErr]
  );

  const loadList = useCallback(async () => {
    try {
      const r = await fetch("/api/daily-recaps");
      if (!r.ok) return;
      const data = await r.json();
      const rows: RecapRow[] = (data.recaps ?? []).map(
        (x: {
          id: string;
          date: string;
          keptLossLimit: boolean;
          setupsOnly: boolean;
          noStopMoving: boolean;
          disciplineScore: number;
          lessonOfDay: string;
          sessionStatus: string | null;
          sessionEfficiency: number | null;
        }) => ({
          ...x,
          date: typeof x.date === "string" ? x.date.slice(0, 10) : x.date,
        })
      );
      setList(rows);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/daily-recaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          keptLossLimit,
          setupsOnly,
          noStopMoving,
          madePlan,
          followedPlan,
          preMarketJournal,
          keptMaxTrades,
          keptRiskRules,
          lessonOfDay,
        }),
      });
      if (!r.ok) throw new Error("save");
      const data = await r.json();
      applyDayPayload(data);
      toast.success(t.saveOk);
      loadList();
    } catch {
      toast.error(t.saveErr);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">{t.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{t.subtitle}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,280px]">
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500">{t.date}</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2">
              <p className="text-xs text-slate-500">{t.pnlLabel}</p>
              <p className={`text-lg font-semibold ${(dayPnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {loading ? "—" : `${(dayPnl ?? 0) >= 0 ? "+" : ""}${(dayPnl ?? 0).toFixed(2)}`}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2">
              <p className="text-xs text-slate-500">{t.trades}</p>
              <p className="text-lg font-semibold text-white">{loading ? "—" : tradesCount}</p>
            </div>
          </div>

          {!loading && tradesCount > 0 && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{t.dayStatsTitle}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">{t.wins}</p>
                  <p className="font-semibold text-emerald-400 tabular-nums">{dayWins}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.losses}</p>
                  <p className="font-semibold text-red-400 tabular-nums">{dayLosses}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.breakeven}</p>
                  <p className="font-semibold text-slate-300 tabular-nums">{dayBreakeven}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.fees}</p>
                  <p className="font-semibold text-white tabular-nums">{totalFees.toFixed(2)}</p>
                </div>
              </div>
              <Link
                href={`/dashboard/trades?dateFrom=${selectedDate}&dateTo=${selectedDate}`}
                className="mt-3 inline-block text-xs text-blue-400 hover:text-blue-300"
              >
                {t.linkTrades}
              </Link>
            </div>
          )}

          {!loading && sessionMetrics && sessionMetrics.tradesCount > 0 && (
            <div className="rounded-xl border border-cyan-500/20 bg-slate-950/50 p-4 font-mono">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {t.sessionEfficiency}
                </span>
                {(() => {
                  const Icon = sessionPersonaIcon(sessionMetrics.persona);
                  return <Icon className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />;
                })()}
              </div>
              <p className="text-sm font-semibold text-white">
                {personaLabel(sessionMetrics.persona, t)}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                {t.netPerFees}:{" "}
                <span className="tabular-nums text-slate-300">
                  {sessionMetrics.efficiencyPerFeeUsd != null
                    ? sessionMetrics.efficiencyPerFeeUsd.toFixed(2)
                    : "—"}
                </span>
              </p>
              <p className="mt-0.5 text-[10px] text-slate-600">
                {t.netPerFeesFormula}:{" "}
                <span className="tabular-nums">
                  {sessionMetrics.efficiencyUserFormula != null
                    ? sessionMetrics.efficiencyUserFormula.toFixed(4)
                    : "—"}
                </span>
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                  <span>{t.scoreBar}</span>
                  <span className="tabular-nums">{Math.round(sessionMetrics.efficiencyScore)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-400 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, sessionMetrics.efficiencyScore))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={keptLossLimit}
                onChange={(e) => setKeptLossLimit(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              {t.checklist1}
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={setupsOnly}
                onChange={(e) => setSetupsOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              {t.checklist2}
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={noStopMoving}
                onChange={(e) => setNoStopMoving(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              {t.checklist3}
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={madePlan}
                onChange={(e) => setMadePlan(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              {t.checklist4}
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={followedPlan}
                onChange={(e) => setFollowedPlan(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              {t.checklist5}
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={preMarketJournal}
                onChange={(e) => setPreMarketJournal(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              {t.checklist6}
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={keptMaxTrades}
                onChange={(e) => setKeptMaxTrades(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              {t.checklist7}
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={keptRiskRules}
                onChange={(e) => setKeptRiskRules(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
              {t.checklist8}
            </label>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs text-slate-500">{t.score}</p>
            <p className="mt-1 text-3xl font-bold text-blue-300">{disciplineScore}</p>
            <p className="mt-1 text-xs text-slate-500">{t.scoreHint}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500">{t.lesson}</label>
            <textarea
              value={lessonOfDay}
              onChange={(e) => setLessonOfDay(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-600"
              placeholder="…"
            />
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow shadow-blue-950/40 transition hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </form>

        <aside className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
          <h2 className="text-sm font-medium text-slate-300">{t.recent}</h2>
          <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto text-sm">
            {list.map((row) => {
              const personaKey = row.sessionStatus ?? "balanced";
              const ListIcon = sessionPersonaIcon(personaKey);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(row.date)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      row.date === selectedDate ? "bg-blue-600/20 text-blue-200" : "text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <ListIcon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400/90" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-medium text-white">{row.date}</span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">
                            {t.listDiscipline}: {row.disciplineScore}
                          </span>
                        </div>
                        {row.sessionEfficiency != null && (
                          <p className="mt-0.5 truncate text-[10px] text-slate-500 tabular-nums">
                            {personaLabel(personaKey, t)} · {row.sessionEfficiency.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="text-slate-600 text-xs">{t.listEmpty}</li>}
          </ul>
          <div className="mt-4 flex flex-col gap-2 text-xs">
            <Link href="/dashboard/analytics?tab=advanced" className="text-blue-400 hover:text-blue-300">
              {t.analyticsAdvanced}
            </Link>
            <Link href="/dashboard/analytics?tab=behavior" className="text-blue-400 hover:text-blue-300">
              {t.analyticsBehavior}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
