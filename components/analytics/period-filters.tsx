"use client";

import { AnalyticsPeriod } from "@/components/analytics/types";

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
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={canFetch ? exportHref : "#"}
          onClick={(e) => !canFetch && e.preventDefault()}
          className="rounded-xl bg-slate-700/80 px-4 py-2 text-sm text-white transition hover:bg-slate-600/80 disabled:opacity-50"
        >
          Export CSV
        </a>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as AnalyticsPeriod)}
          className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="day">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
          <option value="custom">Custom range</option>
        </select>
        {period === "custom" && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50"
              placeholder="From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50"
              placeholder="To"
            />
          </>
        )}
      </div>
    </div>
  );
}
