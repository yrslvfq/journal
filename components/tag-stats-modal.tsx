"use client";

import { useEffect, useState } from "react";

type Stats = {
  tag: string;
  tradesCount: number;
  winRate: number;
  profitFactor: number | null;
  totalPnl: number;
};

export function TagStatsModal({
  tagName,
  open,
  onClose,
}: {
  tagName: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !tagName) {
      setStats(null);
      return;
    }
    setLoading(true);
    setErr("");
    fetch(`/api/trades/tag-stats?tag=${encodeURIComponent(tagName)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        setStats(d);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [open, tagName]);

  if (!open || !tagName) return null;

  const displayTag = tagName.startsWith("#") ? tagName : `#${tagName}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold text-white pr-8 mb-1">Паттерн / тег</h2>
        <p className="text-sm text-blue-400 font-mono mb-4">{displayTag}</p>
        {loading && <p className="text-slate-400 text-sm">Загрузка…</p>}
        {err && <p className="text-red-400 text-sm">{err}</p>}
        {!loading && !err && stats && (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Сделок</dt>
              <dd className="text-white font-medium text-lg">{stats.tradesCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Winrate</dt>
              <dd className="text-emerald-400 font-medium text-lg">
                {stats.tradesCount ? `${stats.winRate.toFixed(1)}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Profit Factor</dt>
              <dd className="text-white font-medium text-lg">
                {stats.profitFactor != null && Number.isFinite(stats.profitFactor)
                  ? stats.profitFactor.toFixed(2)
                  : stats.tradesCount && stats.profitFactor === null
                  ? "∞"
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Суммарный P&amp;L</dt>
              <dd
                className={`font-medium text-lg ${
                  stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {stats.totalPnl >= 0 ? "+" : ""}
                {stats.totalPnl.toFixed(2)}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
