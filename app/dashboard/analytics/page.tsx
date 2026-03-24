"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnalyticsHubTabs } from "@/components/analytics/hub-tabs";
import { AnalyticsPeriodFilters } from "@/components/analytics/period-filters";
import { AnalyticsTabContent } from "@/components/analytics/tab-content";
import { SkeletonCard, SkeletonChart } from "@/components/ui/skeleton";
import { AnalyticsDto, AnalyticsPeriod, AnalyticsTabId } from "@/components/analytics/types";

const HUB_TABS: { id: AnalyticsTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "funnel", label: "Funnel" },
  { id: "risk", label: "Risk" },
  { id: "segments", label: "Segments" },
  { id: "time-patterns", label: "Time Patterns" },
  { id: "quality", label: "Quality" },
  { id: "psych", label: "Psych" },
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

  if (!data) {
    return null;
  }

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
      <AnalyticsTabContent activeTab={activeTab} data={data} />
    </div>
  );
}
