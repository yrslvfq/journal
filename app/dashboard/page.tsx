import Link from "next/link";
import { DashboardHomeSnapshot } from "@/components/dashboard-home-snapshot";

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      <DashboardHomeSnapshot />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/dashboard/trades"
          className="block p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:shadow-glow-sm transition-all duration-200"
        >
          <h2 className="font-semibold text-white">Trades</h2>
          <p className="text-sm text-slate-500 mt-1">View and add trades</p>
        </Link>
        <Link
          href="/dashboard/analytics"
          className="block p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:shadow-glow-sm transition-all duration-200"
        >
          <h2 className="font-semibold text-white">Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Hub, segments, behavior</p>
        </Link>
        <Link
          href="/dashboard/daily-recaps"
          className="block p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:shadow-glow-sm transition-all duration-200"
        >
          <h2 className="font-semibold text-white">Daily recaps</h2>
          <p className="text-sm text-slate-500 mt-1">Discipline & session efficiency</p>
        </Link>
        <Link
          href="/dashboard/settings"
          className="block p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:shadow-glow-sm transition-all duration-200"
        >
          <h2 className="font-semibold text-white">Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Setup & confirmation types</p>
        </Link>
      </div>
    </div>
  );
}
