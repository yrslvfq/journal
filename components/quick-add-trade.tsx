"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { localDateYMD } from "@/lib/local-date";

export function QuickAddTrade() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    direction: "long" as "long" | "short",
    risk: "",
    rr: "2",
    outcome: "win" as "win" | "loss" | "be",
    date: localDateYMD(),
  });
  const [killBlocked, setKillBlocked] = useState(false);
  const [killSeconds, setKillSeconds] = useState(0);

  const refreshKill = useCallback(async (ymd: string) => {
    const res = await fetch(`/api/trades/kill-switch?date=${encodeURIComponent(ymd)}`);
    const data = await res.json();
    if (!res.ok) return;
    setKillBlocked(!!data.blocked);
    setKillSeconds(typeof data.secondsRemaining === "number" ? data.secondsRemaining : 0);
  }, []);

  const openModal = useCallback(() => {
    setOpen(true);
    const ymd = form.date || localDateYMD();
    refreshKill(ymd);
  }, [form.date, refreshKill]);
  const closeModal = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    if (!open || !killBlocked || killSeconds <= 0) return;
    const t = setInterval(() => {
      setKillSeconds((s) => {
        if (s <= 1) {
          refreshKill(form.date || localDateYMD());
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, killBlocked, killSeconds, form.date, refreshKill]);

  useEffect(() => {
    if (!open) return;
    refreshKill(form.date || localDateYMD());
  }, [open, form.date, refreshKill]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (killBlocked) return;
    if (!form.symbol.trim() || !form.risk || parseFloat(form.risk) <= 0) return;
    setLoading(true);
    const body = {
      symbol: form.symbol.trim(),
      direction: form.direction,
      instrumentType: "options" as const,
      risk: parseFloat(form.risk),
      rr: parseFloat(form.rr || "1"),
      outcome: form.outcome,
      fees: 0,
      date: form.date,
      marketCondition: null,
      notes: null,
      confirmationNotes: null,
      tags: [],
      setupIds: [],
      confirmationIds: [],
    };
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed to create trade");
      return;
    }
    toast.success("Trade added");
    setOpen(false);
    setForm({
      symbol: "",
      direction: "long",
      risk: "",
      rr: "2",
      outcome: "win",
      date: localDateYMD(),
    });
    router.push(`/dashboard/trades/${data.id}`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition flex items-center justify-center"
        aria-label="Quick add trade"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-semibold text-white">Quick add trade</h2>
                <p className="text-sm text-slate-500 mt-1">Cmd+K / Ctrl+K to toggle</p>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {killBlocked && (
                  <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    <p className="font-medium mb-1">Пауза обязательна</p>
                    <p className="text-red-300/90 text-xs mb-2">
                      Три убыточные сделки подряд за этот день. Обратный отсчёт до разблокировки:
                    </p>
                    <p className="text-2xl font-mono text-amber-400 tabular-nums">
                      {String(Math.floor(killSeconds / 60)).padStart(2, "0")}:
                      {String(killSeconds % 60).padStart(2, "0")}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Symbol *</label>
                  <input
                    type="text"
                    value={form.symbol}
                    onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                    placeholder="AAPL"
                    required
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Direction</label>
                    <select
                      value={form.direction}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, direction: e.target.value as "long" | "short" }))
                      }
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Outcome</label>
                    <select
                      value={form.outcome}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, outcome: e.target.value as "win" | "loss" | "be" }))
                      }
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="win">Take profit</option>
                      <option value="loss">Stop loss</option>
                      <option value="be">Break even</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Risk ($) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={form.risk}
                      onChange={(e) => setForm((f) => ({ ...f, risk: e.target.value }))}
                      required
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">R:R</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={form.rr}
                      onChange={(e) => setForm((f) => ({ ...f, rr: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || killBlocked}
                    className="flex-1 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
