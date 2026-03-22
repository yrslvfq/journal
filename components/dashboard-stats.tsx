"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function DashboardStats() {
  const [stats, setStats] = useState<{
    totalPnl: number;
    tradesCount: number;
    winRate: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/analytics?period=month")
      .then((r) => r.json())
      .then((d) => setStats(d.summary));
  }, []);

  if (!stats) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
        <p className="text-slate-500 text-sm">Month P&L</p>
        <p
          className={`text-xl font-bold mt-1 ${
            stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {stats.totalPnl >= 0 ? "+" : ""}
          {stats.totalPnl.toFixed(2)}
        </p>
      </div>
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
        <p className="text-slate-500 text-sm">Trades this month</p>
        <p className="text-xl font-bold text-white mt-1">{stats.tradesCount}</p>
      </div>
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5">
        <p className="text-slate-500 text-sm">Win rate</p>
        <p className="text-xl font-bold text-white mt-1">
          {stats.winRate.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
