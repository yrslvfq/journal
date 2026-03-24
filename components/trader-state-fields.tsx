"use client";

import { useAppLanguage } from "@/lib/app-language";
import { dashboardT } from "@/lib/i18n/dashboard";

export type TraderStateValues = {
  energyLevel: number | null;
  sleepHours: string;
  stressLevel: "" | "low" | "medium" | "high";
  stateMoodTag: string;
};

type Props = {
  value: TraderStateValues;
  onChange: (next: TraderStateValues) => void;
};

export function TraderStateFields({ value, onChange }: Props) {
  const lang = useAppLanguage();
  const ts = dashboardT(lang).traderState;
  const moodPresets = [...dashboardT(lang).traderMoodPresets];
  const energy = value.energyLevel ?? 3;

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-5 space-y-6">
      <h2 className="text-sm font-semibold text-white tracking-wide">{ts.sectionTitle}</h2>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-300">{ts.energy}</span>
          <span className="text-sm font-mono text-blue-400">{energy}</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ ...value, energyLevel: n })}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${
                energy === n
                  ? "bg-blue-600/30 border-blue-500/60 text-white"
                  : "bg-slate-800/80 border-slate-700/80 text-slate-400 hover:border-slate-600"
              }`}
              aria-pressed={energy === n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-2">{ts.sleep}</label>
        <input
          type="range"
          min={0}
          max={12}
          step={0.5}
          value={value.sleepHours === "" ? 7 : Number(value.sleepHours)}
          onChange={(e) => onChange({ ...value, sleepHours: e.target.value })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{ts.sleep0}</span>
          <span className="text-slate-300 font-mono">
            {value.sleepHours === "" ? "—" : `${value.sleepHours} ${lang === "ru" ? "ч" : "h"}`}
          </span>
          <span>{ts.sleep12}</span>
        </div>
      </div>

      <div>
        <span className="block text-sm text-zinc-300 mb-2">{ts.stress}</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "low" as const, label: ts.stressLow },
              { key: "medium" as const, label: ts.stressMed },
              { key: "high" as const, label: ts.stressHigh },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  stressLevel: value.stressLevel === key ? "" : key,
                })
              }
              className={`px-4 py-2 rounded-xl text-sm border transition ${
                value.stressLevel === key
                  ? "bg-amber-600/25 border-amber-500/50 text-amber-200"
                  : "bg-slate-800/80 border-slate-700/80 text-slate-400 hover:border-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm text-zinc-300 mb-2">{ts.moodTag}</span>
        <div className="flex flex-wrap gap-2 mb-3">
          {moodPresets.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, stateMoodTag: m })}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                value.stateMoodTag === m
                  ? "bg-violet-600/25 border-violet-500/50 text-violet-200"
                  : "bg-slate-800/80 border-slate-700/70 text-slate-400 hover:border-slate-600"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={value.stateMoodTag}
          onChange={(e) => onChange({ ...value, stateMoodTag: e.target.value })}
          placeholder={ts.moodPlaceholder}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-sm"
        />
      </div>
    </div>
  );
}

export function defaultTraderState(): TraderStateValues {
  return {
    energyLevel: 3,
    sleepHours: "7",
    stressLevel: "",
    stateMoodTag: "",
  };
}
