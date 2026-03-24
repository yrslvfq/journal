"use client";

import { AnalyticsTabId } from "@/components/analytics/types";

type AnalyticsTab = {
  id: AnalyticsTabId;
  label: string;
};

type HubTabsProps = {
  tabs: AnalyticsTab[];
  activeTab: AnalyticsTabId;
  onChange: (tab: AnalyticsTabId) => void;
};

export function AnalyticsHubTabs({ tabs, activeTab, onChange }: HubTabsProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-xl px-4 py-2 text-sm transition ${
                isActive
                  ? "bg-blue-600/90 text-white shadow shadow-blue-950/60"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-700/80"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
