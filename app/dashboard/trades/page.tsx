"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SkeletonTable } from "@/components/ui/skeleton";

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
  tags: { name: string }[];
  setups: { setupType: { id: string; name: string } }[];
  confirmations: { confirmationType: { id: string; name: string } }[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function TradesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [tag, setTag] = useState("");
  const [instrumentType, setInstrumentType] = useState("");
  const [setupId, setSetupId] = useState("");
  const [confirmationId, setConfirmationId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [setupTypes, setSetupTypes] = useState<{ id: string; name: string }[]>([]);
  const [confirmationTypes, setConfirmationTypes] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);

  function buildQueryParams(forExport = false) {
    const params = forExport ? new URLSearchParams() : new URLSearchParams({ page: String(page) });
    if (symbol) params.set("symbol", symbol);
    if (tag) params.set("tag", tag);
    if (instrumentType) params.set("instrumentType", instrumentType);
    if (setupId) params.set("setupId", setupId);
    if (confirmationId) params.set("confirmationId", confirmationId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params;
  }

  async function fetchTrades() {
    setLoading(true);
    const res = await fetch(`/api/trades?${buildQueryParams()}`);
    const data = await res.json();
    if (res.ok) {
      setTrades(data.trades);
      setPagination(data.pagination);
    }
    setLoading(false);
  }

  async function fetchTags() {
    const res = await fetch("/api/trades/tags");
    const data = await res.json();
    if (res.ok) setTags(data);
  }

  useEffect(() => {
    fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, symbol, tag, instrumentType, setupId, confirmationId, dateFrom, dateTo]);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    const df = searchParams.get("dateFrom")?.trim();
    const dt = searchParams.get("dateTo")?.trim();
    if (df) setDateFrom(df);
    if (dt) setDateTo(dt);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/setup-types").then((r) => r.json()).then(setSetupTypes);
    fetch("/api/confirmation-types").then((r) => r.json()).then(setConfirmationTypes);
  }, []);

  const handleFilter = () => {
    setPage(1);
    fetchTrades();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === trades.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trades.map((t) => t.id)));
    }
  };

  async function handleBulkDelete() {
    if (selectedIds.size === 0 || !confirm(`Delete ${selectedIds.size} trades?`)) return;
    setBulkDeleting(true);
    const res = await fetch("/api/trades/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    const data = await res.json();
    setBulkDeleting(false);
    if (res.ok) {
      toast.success(`${data.deleted} trades deleted`);
      setSelectedIds(new Set());
      fetchTrades();
      router.refresh();
    } else {
      toast.error(data.error || "Failed to delete");
    }
  }

  function handleBulkExport() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    window.open(`/api/trades/export?ids=${ids.join(",")}`, "_blank");
    toast.success("Export started");
  }

  async function handleDuplicate(tradeId: string) {
    setDuplicatingId(tradeId);
    const res = await fetch(`/api/trades/${tradeId}/duplicate`, {
      method: "POST",
    });
    const data = await res.json();
    setDuplicatingId(null);
    if (res.ok) {
      toast.success("Trade duplicated");
      router.push(`/dashboard/trades/${data.id}`);
      router.refresh();
    } else {
      toast.error(data.error || "Failed to duplicate");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Trades</h1>
        <div className="flex gap-2">
          <a
            href={`/api/trades/export?${buildQueryParams(true)}`}
            className="px-4 py-2 rounded-xl bg-slate-700/80 text-white font-medium hover:bg-slate-600/80 transition-all duration-200"
          >
            Export CSV
          </a>
          <Link
            href="/dashboard/trades/gallery"
            className="px-4 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 transition"
          >
            Gallery
          </Link>
          <Link
            href="/dashboard/trades/new"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-all duration-200"
          >
            Add trade
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <input
          type="text"
          placeholder="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFilter()}
          className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 w-32 focus:ring-2 focus:ring-blue-500/50"
        />
        <select
          value={instrumentType}
          onChange={(e) => setInstrumentType(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All types</option>
          <option value="options">Options</option>
          <option value="futures">Futures</option>
          <option value="stocks">Stocks</option>
        </select>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={setupId}
          onChange={(e) => setSetupId(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All setups</option>
          {setupTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={confirmationId}
          onChange={(e) => setConfirmationId(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">All confirmations</option>
          {confirmationTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          placeholder="From"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50"
          title="Date from"
        />
        <input
          type="date"
          placeholder="To"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50"
          title="Date to"
        />
        <button
          onClick={handleFilter}
          className="px-4 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 transition-all duration-200"
        >
          Filter
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80">
          <span className="text-slate-400">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 text-sm"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkExport}
              className="px-4 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 text-sm"
            >
              Export selected
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-4 py-2 rounded-xl bg-red-900/60 text-red-400 hover:bg-red-900/80 disabled:opacity-50 text-sm"
            >
              {bulkDeleting ? "Deleting..." : "Delete selected"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={10} />
      ) : trades.length === 0 ? (
        <div className="text-slate-500 py-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/80">
          No trades yet.{" "}
          <Link href="/dashboard/trades/new" className="text-blue-400 hover:text-blue-300 transition">
            Add your first trade
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={trades.length > 0 && selectedIds.size === trades.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-600"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Dir</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Condition</th>
                  <th className="px-4 py-3 font-medium">P&L</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {trades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="rounded border-slate-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {t.date ? new Date(t.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{t.symbol}</td>
                    <td className="px-4 py-3 text-slate-300">{t.direction}</td>
                    <td className="px-4 py-3 text-slate-300">{t.instrumentType}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {t.marketCondition
                        ? t.marketCondition.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        t.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {t.pnl >= 0 ? "+" : ""}
                      {t.pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.tags.map((tg) => (
                          <span
                            key={tg.name}
                            className="px-2 py-0.5 rounded-lg bg-slate-700/60 text-xs text-slate-300"
                          >
                            {tg.name}
                          </span>
                        ))}
                        {t.setups?.map((s) => (
                          <span
                            key={s.setupType.id}
                            className="px-2 py-0.5 rounded-lg bg-blue-900/40 text-xs text-blue-400"
                          >
                            {s.setupType.name}
                          </span>
                        ))}
                        {t.confirmations?.map((c) => (
                          <span
                            key={c.confirmationType.id}
                            className="px-2 py-0.5 rounded-lg bg-emerald-900/40 text-xs text-emerald-400"
                          >
                            {c.confirmationType.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/trades/${t.id}`}
                          className="text-blue-400 hover:text-blue-300 text-xs transition"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(t.id)}
                          disabled={duplicatingId === t.id}
                          className="text-slate-400 hover:text-white text-xs transition disabled:opacity-50"
                        >
                          {duplicatingId === t.id ? "..." : "Duplicate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl bg-slate-800/80 text-white disabled:opacity-50 hover:bg-slate-700/80 transition"
              >
                Prev
              </button>
              <span className="px-4 py-2 text-slate-400">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-4 py-2 rounded-xl bg-slate-800/80 text-white disabled:opacity-50 hover:bg-slate-700/80 transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TradesPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={10} />}>
      <TradesPageContent />
    </Suspense>
  );
}
