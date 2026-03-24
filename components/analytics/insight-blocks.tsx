"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import type { AppLanguage } from "@/lib/app-language";
import type {
  ActionableInsightDto,
  AnalyticsRecapSummaryDto,
  TraderBehaviorDto,
} from "@/components/analytics/types";

export function severityStyles(s: ActionableInsightDto["severity"]) {
  switch (s) {
    case "critical":
      return "border-red-500/40 bg-red-500/[0.08] text-red-100/95";
    case "warning":
      return "border-amber-500/35 bg-amber-500/[0.08] text-amber-100/95";
    case "positive":
      return "border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-100/95";
    default:
      return "border-blue-500/35 bg-blue-500/[0.08] text-slate-100/95";
  }
}

function SeverityIcon({ severity }: { severity: ActionableInsightDto["severity"] }) {
  switch (severity) {
    case "critical":
    case "warning":
      return <AlertTriangle className="h-5 w-5 shrink-0 text-current opacity-90" aria-hidden />;
    case "positive":
      return <CheckCircle2 className="h-5 w-5 shrink-0 text-current opacity-90" aria-hidden />;
    default:
      return <Info className="h-5 w-5 shrink-0 text-current opacity-90" aria-hidden />;
  }
}

export function ContextualTiltBanner({
  tilt,
  lang,
}: {
  tilt: TraderBehaviorDto["contextualTilt"];
  lang: AppLanguage;
}) {
  if (!tilt.show) return null;
  return (
    <div className="flex gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100/95 backdrop-blur-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
      <p className="leading-snug">{lang === "ru" ? tilt.messageRu : tilt.messageEn}</p>
    </div>
  );
}

export function RecapSummaryStrip({
  recap,
  lang,
}: {
  recap: AnalyticsRecapSummaryDto;
  lang: AppLanguage;
}) {
  if (recap.recapsInPeriod <= 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
      <span className="text-slate-500">
        {lang === "ru" ? "Дневные итоги" : "Daily recaps"} ({recap.recapsInPeriod})
      </span>
      <span className="tabular-nums">
        {lang === "ru" ? "Дисциплина" : "Discipline"}:{" "}
        <strong className="text-white">{Math.round(recap.avgDisciplineScore)}</strong>/100
      </span>
      {recap.avgSessionEfficiency != null && (
        <span className="tabular-nums text-slate-400">
          {lang === "ru" ? "Эфф. сессии ($/$ комиссий)" : "Session eff. ($/$ fees)"}:{" "}
          <strong className="text-slate-200">{recap.avgSessionEfficiency.toFixed(2)}</strong>
        </span>
      )}
      <Link
        href="/dashboard/daily-recaps"
        className="ml-auto inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
      >
        {lang === "ru" ? "Открыть" : "Open"} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function ActionableInsightsList({
  insights,
  lang,
  titleRu,
  titleEn,
  className = "",
}: {
  insights: ActionableInsightDto[];
  lang: AppLanguage;
  titleRu?: string;
  titleEn?: string;
  className?: string;
}) {
  if (insights.length === 0) return null;
  const title =
    lang === "ru" ? titleRu ?? "Что важно сейчас" : titleEn ?? "Actionable insights";
  return (
    <div className={className}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <ul className="space-y-3">
        {insights.map((ins) => {
          const t = lang === "ru" ? ins.titleRu : ins.titleEn;
          const detail = lang === "ru" ? ins.detailRu : ins.detailEn;
          const content = (
            <div
              className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur-sm ${severityStyles(ins.severity)}`}
            >
              <SeverityIcon severity={ins.severity} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{t}</p>
                <p className="mt-1 leading-snug opacity-90">{detail}</p>
              </div>
              {ins.href && (
                <ArrowRight className="h-4 w-4 shrink-0 self-center opacity-60" aria-hidden />
              )}
            </div>
          );
          return (
            <li key={ins.id}>
              {ins.href ? (
                <Link href={ins.href} className="block transition hover:opacity-95">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
