"use client";

export type TradeBehaviorFormValues = {
  marketVolatility: "" | "low" | "medium" | "high";
  sessionType: "" | "trend" | "range";
  exitType: "system" | "manual";
  realizedPnl: string;
  entryPrice: string;
  exitPrice: string;
  initialTp: string;
  initialSl: string;
  price5mAfter: string;
  price15mAfter: string;
  price60mAfter: string;
};

type Props = {
  values: TradeBehaviorFormValues;
  onChange: <K extends keyof TradeBehaviorFormValues>(key: K, value: TradeBehaviorFormValues[K]) => void;
};

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700/80 text-sm text-white font-mono tabular-nums focus:ring-1 focus:ring-blue-500/50";

export function TradeBehaviorFields({ values, onChange }: Props) {
  return (
    <details className="rounded-xl border border-slate-700/50 bg-slate-950/25 open:ring-1 open:ring-slate-600/30">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-300 hover:text-white">
        Execution & behavior (volatility, exits, ghost stop, drift)
      </summary>
      <div className="space-y-4 border-t border-slate-800/80 px-4 pb-4 pt-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Market volatility
            </label>
            <select
              value={values.marketVolatility}
              onChange={(e) =>
                onChange("marketVolatility", e.target.value as TradeBehaviorFormValues["marketVolatility"])
              }
              className={inputCls}
            >
              <option value="">—</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Session type
            </label>
            <select
              value={values.sessionType}
              onChange={(e) =>
                onChange("sessionType", e.target.value as TradeBehaviorFormValues["sessionType"])
              }
              className={inputCls}
            >
              <option value="">—</option>
              <option value="trend">Trend</option>
              <option value="range">Range</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Exit type
            </label>
            <select
              value={values.exitType}
              onChange={(e) =>
                onChange("exitType", e.target.value as TradeBehaviorFormValues["exitType"])
              }
              className={inputCls}
            >
              <option value="system">System (TP/SL)</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          {values.exitType === "manual" && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Realized P&amp;L ($)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={values.realizedPnl}
                onChange={(e) => onChange("realizedPnl", e.target.value)}
                placeholder="Actual $ result"
                className={inputCls}
              />
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Initial TP/SL + entry/exit prices enable <span className="text-slate-400">Cost of Fear</span> when exit is
          manual. Post-exit prices measure favorable drift after you flat.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["entryPrice", "Entry"],
              ["exitPrice", "Exit"],
              ["initialTp", "Initial TP"],
              ["initialSl", "Initial SL"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</label>
              <input
                type="text"
                inputMode="decimal"
                value={values[key]}
                onChange={(e) => onChange(key, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["price5mAfter", "Price +5m"],
              ["price15mAfter", "Price +15m"],
              ["price60mAfter", "Price +60m"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</label>
              <input
                type="text"
                inputMode="decimal"
                value={values[key]}
                onChange={(e) => onChange(key, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export function defaultTradeBehaviorForm(): TradeBehaviorFormValues {
  return {
    marketVolatility: "",
    sessionType: "",
    exitType: "system",
    realizedPnl: "",
    entryPrice: "",
    exitPrice: "",
    initialTp: "",
    initialSl: "",
    price5mAfter: "",
    price15mAfter: "",
    price60mAfter: "",
  };
}

export function behaviorPayloadFromForm(b: TradeBehaviorFormValues) {
  const opt = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };
  return {
    marketVolatility: b.marketVolatility || null,
    sessionType: b.sessionType || null,
    exitType: b.exitType,
    realizedPnl: b.exitType === "manual" ? opt(b.realizedPnl) : null,
    entryPrice: opt(b.entryPrice),
    exitPrice: opt(b.exitPrice),
    initialTp: opt(b.initialTp),
    initialSl: opt(b.initialSl),
    price5mAfter: opt(b.price5mAfter),
    price15mAfter: opt(b.price15mAfter),
    price60mAfter: opt(b.price60mAfter),
  };
}
