"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TradeImage = { id: string; url: string; caption: string | null };
type Trade = {
  id: string;
  symbol: string;
  direction: string;
  instrumentType: string;
  risk: number;
  rr: number;
  outcome: string;
  pnl: number;
  fees: number;
  date: string;
  marketCondition: string | null;
  notes: string | null;
  confirmationNotes: string | null;
  tags: { name: string }[];
  images?: TradeImage[];
  setups: { setupType: { id: string; name: string } }[];
  confirmations: { confirmationType: { id: string; name: string } }[];
};

function groupByMonth(trades: Trade[]) {
  const groups: Record<string, Trade[]> = {};
  for (const t of trades) {
    const key = t.date ? new Date(t.date).toLocaleDateString("en", { year: "numeric", month: "long" }) : "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return groups;
}

export default function TradesGalleryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Trade | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    fetch(`/api/trades?includeImages=true&dateFrom=${from}&dateTo=${to}&limit=100`)
      .then((r) => r.json())
      .then((d) => {
        if (d.trades) setTrades(d.trades);
      })
      .finally(() => setLoading(false));
  }, [year]);

  const groups = groupByMonth(trades);
  const months = Object.keys(groups).sort((a, b) => {
    const [monA, yearA] = a.split(" ");
    const [monB, yearB] = b.split(" ");
    const dA = new Date(`${monA} 1, ${yearA}`);
    const dB = new Date(`${monB} 1, ${yearB}`);
    return dB.getTime() - dA.getTime();
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Trades Gallery
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
          >
            {[year + 1, year, year - 1, year - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Link
            href="/dashboard/trades/new"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-all duration-200"
          >
            Add trade
          </Link>
          <Link
            href="/dashboard/trades"
            className="px-4 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 transition"
          >
            Table view
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] rounded-2xl bg-slate-800/40 animate-pulse"
            />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <p className="text-slate-400 mb-2">No trades in {year}</p>
          <Link href="/dashboard/trades/new" className="text-blue-400 hover:text-blue-300">
            Add your first trade
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {months.map((month) => (
            <section key={month}>
              <h2 className="text-lg font-semibold text-slate-300 mb-4 sticky top-0 py-2 bg-[#080c14]/95 backdrop-blur-sm z-10">
                {month}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {groups[month].map((trade) => (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    onClick={() => setSelected(trade)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected && (
        <TradeModal
          trade={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function TradeCard({
  trade,
  onClick,
}: {
  trade: Trade;
  onClick: () => void;
}) {
  const thumb = trade.images?.[0]?.url;
  const shortNote = (trade.notes || trade.confirmationNotes || "")
    .slice(0, 80);
  const dateStr = trade.date
    ? new Date(trade.date).toLocaleDateString("en", {
        day: "numeric",
        month: "short",
      })
    : "—";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800/80 hover:border-slate-600/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
    >
      <div className="aspect-[4/3] relative bg-slate-800/80 overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/80 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        )}
        <div
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-xs font-semibold ${
            trade.pnl >= 0 ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
          }`}
        >
          {trade.pnl >= 0 ? "+" : ""}
          {trade.pnl.toFixed(0)}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-semibold text-white truncate">
            {trade.symbol}
          </span>
          <span className="text-xs text-slate-500 shrink-0">{dateStr}</span>
        </div>
        <div className="flex flex-wrap gap-1 mb-1">
          <span className="px-1.5 py-0.5 rounded bg-slate-700/60 text-xs text-slate-400">
            {trade.direction}
          </span>
          {trade.marketCondition && (
            <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-xs text-blue-400 truncate max-w-[80px]">
              {trade.marketCondition.replace("_", " ")}
            </span>
          )}
        </div>
        {shortNote && (
          <p className="text-xs text-slate-500 line-clamp-2">{shortNote}</p>
        )}
      </div>
    </button>
  );
}

function TradeModal({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const dateStr = trade.date
    ? new Date(trade.date).toLocaleDateString("en", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-4 sm:inset-8 lg:inset-16 z-50 overflow-y-auto">
        <div
          className="min-h-full flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {trade.images?.[0]?.url ? (
                <div className="aspect-video bg-slate-800">
                  <img
                    src={trade.images[0].url}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center transition"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {trade.symbol} — {trade.direction}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">{dateStr}</p>
                </div>
                <span
                  className={`text-xl font-semibold shrink-0 ${
                    trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {trade.pnl >= 0 ? "+" : ""}
                  {trade.pnl.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-lg bg-slate-800 text-xs text-slate-400">
                  {trade.instrumentType}
                </span>
                {trade.marketCondition && (
                  <span className="px-2 py-1 rounded-lg bg-blue-900/40 text-xs text-blue-400">
                    {trade.marketCondition.replace("_", " ")}
                  </span>
                )}
                {trade.tags.map((t) => (
                  <span
                    key={t.name}
                    className="px-2 py-1 rounded-lg bg-slate-700/60 text-xs text-slate-300"
                  >
                    {t.name}
                  </span>
                ))}
                {trade.setups?.map((s) => (
                  <span
                    key={s.setupType.id}
                    className="px-2 py-1 rounded-lg bg-amber-900/40 text-amber-400 text-xs"
                  >
                    {s.setupType.name}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Risk / R:R</p>
                  <p className="text-white">${trade.risk.toFixed(2)} / 1:{trade.rr}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Outcome</p>
                  <p className="text-white">
                    {trade.outcome === "win"
                      ? "Take profit"
                      : trade.outcome === "loss"
                      ? "Stop loss"
                      : "Break even"}
                  </p>
                </div>
              </div>

              {trade.notes && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{trade.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <Link
                  href={`/dashboard/trades/${trade.id}`}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-center hover:bg-blue-500 transition"
                >
                  Full details
                </Link>
                <Link
                  href={`/dashboard/trades/${trade.id}/edit`}
                  className="py-2.5 px-4 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 transition"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
