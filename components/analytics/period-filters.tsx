"use client";

import { AnalyticsPeriod } from "@/components/analytics/types";
import { useAppLanguage } from "@/lib/app-language";
import { dashboardT } from "@/lib/i18n/dashboard";

type PeriodFiltersProps = {
  period: AnalyticsPeriod;
  dateFrom: string;
  dateTo: string;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  exportHref: string;
  canFetch: boolean;
};

export function AnalyticsPeriodFilters({
  period,
  dateFrom,
  dateTo,
  onPeriodChange,
  onDateFromChange,
  onDateToChange,
  exportHref,
  canFetch,
}: PeriodFiltersProps) {
  const lang = useAppLanguage();
  const p = dashboardT(lang).analyticsPeriod;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={canFetch ? exportHref : "#"}
          onClick={(e) => !canFetch && e.preventDefault()}
          className="rounded-xl bg-slate-700/80 px-4 py-2 text-sm text-white transition hover:bg-slate-600/80 disabled:opacity-50"
        >
          {p.exportCsv}
        </a>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as AnalyticsPeriod)}
          className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="day">{p.day}</option>
          <option value="week">{p.week}</option>
          <option value="month">{p.month}</option>
          <option value="year">{p.year}</option>
          <option value="all">{p.all}</option>
          <option value="custom">{p.custom}</option>
        </select>
        {period === "custom" && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50"
              placeholder={p.from}
              aria-label={p.from}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50"
              placeholder={p.to}
              aria-label={p.to}
            />
          </>
        )}
      </div>
    </div>
  );
}
