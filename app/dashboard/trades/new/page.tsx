"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { TradeKillSwitchGate } from "@/components/trade-kill-switch-gate";
import {
  TraderStateFields,
  defaultTraderState,
  type TraderStateValues,
} from "@/components/trader-state-fields";

type SetupType = { id: string; name: string };
type ConfirmationType = { id: string; name: string };

const MAX_IMAGES = 10;

export default function NewTradePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([]);
  const [confirmationTypes, setConfirmationTypes] = useState<ConfirmationType[]>([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingImageLinks, setPendingImageLinks] = useState<string[]>([]);
  const [imageLinkInput, setImageLinkInput] = useState("");
  const [form, setForm] = useState({
    symbol: "",
    direction: "long" as "long" | "short",
    instrumentType: "options" as "options" | "futures" | "stocks",
    risk: "",
    rr: "2",
    outcome: "win" as "win" | "loss" | "be",
    fees: "0",
    date: new Date().toISOString().slice(0, 10),
    marketCondition: "" as "" | "mean_reversion" | "trend" | "range",
    notes: "",
    confirmationNotes: "",
    tags: "",
    setupIds: [] as string[],
    confirmationIds: [] as string[],
  });
  const [trader, setTrader] = useState<TraderStateValues>(() => defaultTraderState());

  const calculatedPnl =
    form.risk && parseFloat(form.risk) > 0
      ? form.outcome === "win"
        ? parseFloat(form.risk) * parseFloat(form.rr || "1")
        : form.outcome === "loss"
        ? -parseFloat(form.risk)
        : 0
      : null;

  useEffect(() => {
    fetch("/api/setup-types").then((r) => r.json()).then(setSetupTypes);
    fetch("/api/confirmation-types").then((r) => r.json()).then(setConfirmationTypes);
  }, []);

  const addImages = useCallback((files: File[]) => {
    const valid = files.filter(
      (f) => f.type.startsWith("image/") && ["image/png", "image/jpeg", "image/webp"].includes(f.type)
    );
    setPendingImages((prev) => {
      const next = [...prev, ...valid];
      return next.slice(0, MAX_IMAGES);
    });
  }, []);

  const removePendingImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  function addImageLink() {
    const link = imageLinkInput.trim();
    if (!link) return;
    try {
      const u = new URL(link);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
    } catch {
      toast.error("Invalid image URL");
      return;
    }
    setPendingImageLinks((prev) => {
      if (prev.includes(link)) return prev;
      return [...prev, link].slice(0, MAX_IMAGES);
    });
    setImageLinkInput("");
  }

  function removePendingImageLink(index: number) {
    setPendingImageLinks((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest("input") || target?.closest("textarea") || target?.closest("[contenteditable]"))
        return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        addImages(files);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [addImages]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function toggleSetup(id: string) {
    setForm((f) => ({
      ...f,
      setupIds: f.setupIds.includes(id)
        ? f.setupIds.filter((x) => x !== id)
        : [...f.setupIds, id],
    }));
  }

  function toggleConfirmation(id: string) {
    setForm((f) => ({
      ...f,
      confirmationIds: f.confirmationIds.includes(id)
        ? f.confirmationIds.filter((x) => x !== id)
        : [...f.confirmationIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const sleepParsed = parseFloat(trader.sleepHours);
    const body = {
      symbol: form.symbol,
      direction: form.direction,
      instrumentType: form.instrumentType,
      risk: parseFloat(form.risk),
      rr: parseFloat(form.rr || "1"),
      outcome: form.outcome,
      fees: parseFloat(form.fees),
      date: form.date,
      marketCondition: form.marketCondition || null,
      notes: form.notes,
      tags,
      setupIds: form.setupIds,
      confirmationIds: form.confirmationIds,
      confirmationNotes: form.confirmationNotes || null,
      energyLevel: trader.energyLevel ?? 3,
      sleepHours: Number.isFinite(sleepParsed) ? sleepParsed : null,
      stressLevel: trader.stressLevel || null,
      stateMoodTag: trader.stateMoodTag.trim() || null,
    };
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      const err = data.error || "Failed to create trade";
      setError(err);
      toast.error(err);
      return;
    }
    const tradeId = data.id;
    if (pendingImages.length > 0) {
      const formData = new FormData();
      for (const f of pendingImages) formData.append("files", f);
      const imgRes = await fetch(`/api/trades/${tradeId}/images`, {
        method: "POST",
        body: formData,
      });
      if (!imgRes.ok) toast.error("Trade created, but some screenshots failed to upload");
    }
    if (pendingImageLinks.length > 0) {
      for (const url of pendingImageLinks) {
        const linkRes = await fetch(`/api/trades/${tradeId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!linkRes.ok) {
          toast.error("Trade created, but some image links failed to attach");
          break;
        }
      }
    }
    setLoading(false);
    toast.success("Trade created");
    router.push(`/dashboard/trades/${tradeId}`);
    router.refresh();
  }

  return (
    <TradeKillSwitchGate tradeDateYmd={form.date}>
      <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/trades"
          className="text-slate-500 hover:text-white transition"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-bold text-white">Add trade</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6"
      >
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Symbol *
            </label>
            <input
              name="symbol"
              value={form.symbol}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
              placeholder="AAPL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Direction
            </label>
            <select
              name="direction"
              value={form.direction}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Instrument type
          </label>
          <select
            name="instrumentType"
            value={form.instrumentType}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="options">Options</option>
            <option value="futures">Futures</option>
            <option value="stocks">Stocks</option>
          </select>
        </div>

        <div className="grid gap-6 grid-cols-2 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Risk ($) *
            </label>
            <input
              name="risk"
              type="number"
              step="any"
              min="0.01"
              value={form.risk}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              R:R *
            </label>
            <input
              name="rr"
              type="number"
              step="0.1"
              min="0.1"
              value={form.rr}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
              placeholder="2"
              title="Risk:Reward ratio (e.g. 2 = 1:2)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Outcome *
            </label>
            <select
              name="outcome"
              value={form.outcome}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="win">Take profit</option>
              <option value="loss">Stop loss</option>
              <option value="be">Break even</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Fees
            </label>
            <input
              name="fees"
              type="number"
              step="any"
              value={form.fees}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
        {calculatedPnl !== null && (
          <p className="text-sm text-slate-400">
            P&L:{" "}
            <span
              className={
                calculatedPnl >= 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"
              }
            >
              {calculatedPnl >= 0 ? "+" : ""}
              {calculatedPnl.toFixed(2)}
            </span>
            {form.outcome === "win"
              ? ` (Risk × R:R = ${form.risk} × ${form.rr})`
              : form.outcome === "loss"
              ? ` (Loss = Risk)`
              : ` (Break-even)`}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Date *
            </label>
            <input
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Market condition
            </label>
            <select
              name="marketCondition"
              value={form.marketCondition}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">—</option>
              <option value="mean_reversion">Mean reversion</option>
              <option value="trend">Trend</option>
              <option value="range">Range</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Setup (context)
          </label>
          <div className="flex flex-wrap gap-2">
            {setupTypes.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 cursor-pointer hover:border-blue-500/50 transition"
              >
                <input
                  type="checkbox"
                  checked={form.setupIds.includes(t.id)}
                  onChange={() => toggleSetup(t.id)}
                  className="rounded border-zinc-600"
                />
                <span className="text-sm text-zinc-300">{t.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Confirmation
          </label>
          <div className="flex flex-wrap gap-2">
            {confirmationTypes.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 cursor-pointer hover:border-blue-500/50 transition"
              >
                <input
                  type="checkbox"
                  checked={form.confirmationIds.includes(t.id)}
                  onChange={() => toggleConfirmation(t.id)}
                  className="rounded border-zinc-600"
                />
                <span className="text-sm text-zinc-300">{t.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Confirmation notes (optional)
          </label>
          <textarea
            name="confirmationNotes"
            value={form.confirmationNotes}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white resize-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Details about what you saw..."
          />
        </div>

        <TraderStateFields value={trader} onChange={setTrader} />

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Tags (comma-separated, Obsidian: #FakeOut, #VBP_Rejection)
          </label>
          <input
            name="tags"
            value={form.tags}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            placeholder="#FakeOut, #DoubleDistribution, momentum"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Notes
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Связи со сделками: <code className="text-slate-400">[[clxxxxxxxx]]</code> — ID из URL карточки
            сделки.
          </p>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white resize-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Trade notes... Link: [[paste_trade_id_here]]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Screenshots
          </label>
          <div className="flex gap-2 mb-3">
            <input
              value={imageLinkInput}
              onChange={(e) => setImageLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImageLink())}
              placeholder="https://... TradingView screenshot URL"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              type="button"
              onClick={addImageLink}
              className="px-4 py-2.5 rounded-xl bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 transition"
            >
              Add link
            </button>
          </div>
          <div
            className="rounded-xl border-2 border-dashed border-slate-700/80 p-6 text-center hover:border-slate-600/80 transition cursor-pointer"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              addImages(files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) addImages(Array.from(files));
                e.target.value = "";
              }}
            />
            <p className="text-slate-400 text-sm">
              Drop images here, paste (Ctrl+V), or click to upload
            </p>
            {pendingImages.length > 0 && (
              <p className="text-slate-500 text-xs mt-1">
                {pendingImages.length} / {MAX_IMAGES} selected
              </p>
            )}
          </div>
          {pendingImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {pendingImages.map((file, i) => (
                <div
                  key={i}
                  className="relative group aspect-video rounded-xl overflow-hidden bg-slate-800/80 border border-slate-700/80"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePendingImage(i);
                    }}
                    className="absolute top-1 right-1 px-2 py-0.5 rounded-lg bg-red-900/80 text-red-400 text-xs opacity-0 group-hover:opacity-100 transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {pendingImageLinks.length > 0 && (
            <div className="space-y-2 mt-3">
              {pendingImageLinks.map((url, i) => (
                <div
                  key={url}
                  className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-2"
                >
                  <img src={url} alt="" className="w-12 h-8 rounded object-cover bg-slate-900" />
                  <span className="text-xs text-slate-300 truncate flex-1">{url}</span>
                  <button
                    type="button"
                    onClick={() => removePendingImageLink(i)}
                    className="text-xs px-2 py-1 rounded bg-red-900/70 text-red-300 hover:bg-red-900"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-all duration-200"
        >
          {loading ? "Saving..." : "Save trade"}
        </button>
      </form>
      </div>
    </TradeKillSwitchGate>
  );
}
