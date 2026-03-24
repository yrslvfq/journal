"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAppLanguage } from "@/lib/app-language";
import { dashboardT } from "@/lib/i18n/dashboard";
import {
  TraderStateFields,
  defaultTraderState,
  type TraderStateValues,
} from "@/components/trader-state-fields";
import {
  TradeBehaviorFields,
  behaviorPayloadFromForm,
  defaultTradeBehaviorForm,
  type TradeBehaviorFormValues,
} from "@/components/trade-behavior-fields";

type SetupType = { id: string; name: string };
type ConfirmationType = { id: string; name: string };
type TradeImage = { id: string; url: string; caption: string | null };

function tradeToBehavior(t: Record<string, unknown>): TradeBehaviorFormValues {
  const d = defaultTradeBehaviorForm();
  const nStr = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");
  const vol = t.marketVolatility;
  const sess = t.sessionType;
  return {
    ...d,
    marketVolatility: vol === "low" || vol === "medium" || vol === "high" ? vol : "",
    sessionType: sess === "trend" || sess === "range" ? sess : "",
    exitType: t.exitType === "manual" ? "manual" : "system",
    realizedPnl: t.exitType === "manual" && typeof t.pnl === "number" ? String(t.pnl) : "",
    entryPrice: nStr(t.entryPrice),
    exitPrice: nStr(t.exitPrice),
    initialTp: nStr(t.initialTp),
    initialSl: nStr(t.initialSl),
    price5mAfter: nStr(t.price5mAfter),
    price15mAfter: nStr(t.price15mAfter),
    price60mAfter: nStr(t.price60mAfter),
  };
}

export default function EditTradePage() {
  const lang = useAppLanguage();
  const tf = dashboardT(lang).tradeForm;
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([]);
  const [confirmationTypes, setConfirmationTypes] = useState<ConfirmationType[]>([]);
  const [images, setImages] = useState<TradeImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageLinkInput, setImageLinkInput] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : images.length - 1));
      if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : 0));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, images.length]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setImageError("");
      setUploading(true);
      const formData = new FormData();
      for (const f of files) {
        formData.append("files", f);
      }
      const res = await fetch(`/api/trades/${id}/images`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploading(false);
      if (!res.ok) {
        const err = data.error || "Upload failed";
        setImageError(err);
        toast.error(err);
        return;
      }
      toast.success("Screenshot uploaded");
      const created = Array.isArray(data) ? data : [];
      setImages((prev) => [...prev, ...created]);
    },
    [id]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (lightboxIndex !== null) return;
      const target = e.target as HTMLElement;
      if (
        target?.closest("input") ||
        target?.closest("textarea") ||
        target?.closest("[contenteditable]")
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        uploadFiles(imageFiles);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [lightboxIndex, uploadFiles]);

  const [form, setForm] = useState({
    symbol: "",
    direction: "long" as "long" | "short",
    instrumentType: "options" as "options" | "futures" | "stocks",
    risk: "",
    rr: "2",
    outcome: "win" as "win" | "loss" | "be",
    fees: "0",
    date: "",
    marketCondition: "" as "" | "mean_reversion" | "trend" | "range",
    notes: "",
    confirmationNotes: "",
    tags: "",
    setupIds: [] as string[],
    confirmationIds: [] as string[],
  });
  const [trader, setTrader] = useState<TraderStateValues>(() => defaultTraderState());
  const [behavior, setBehavior] = useState<TradeBehaviorFormValues>(() => defaultTradeBehaviorForm());

  const calculatedPnl = useMemo(() => {
    const risk = parseFloat(form.risk);
    const rr = parseFloat(form.rr || "1");
    if (!(risk > 0)) return null;
    if (behavior.exitType === "manual" && behavior.realizedPnl.trim() !== "") {
      const rp = parseFloat(behavior.realizedPnl);
      if (Number.isFinite(rp)) return rp;
    }
    if (form.outcome === "win") return risk * rr;
    if (form.outcome === "loss") return -risk;
    return 0;
  }, [form.risk, form.rr, form.outcome, behavior.exitType, behavior.realizedPnl]);

  useEffect(() => {
    fetch(`/api/trades/${id}`)
      .then((r) => r.json())
      .then((t) => {
        if (t.id) {
          setForm((f) => ({
            ...f,
            symbol: t.symbol,
            direction: t.direction,
            instrumentType: t.instrumentType,
            risk: String(t.risk),
            rr: String(t.rr),
            outcome: t.outcome as "win" | "loss" | "be",
            fees: String(t.fees),
            date: t.date ? new Date(t.date).toISOString().slice(0, 10) : "",
            marketCondition: (t.marketCondition || "") as "" | "mean_reversion" | "trend" | "range",
            notes: t.notes || "",
            confirmationNotes: t.confirmationNotes || "",
            tags: t.tags?.map((x: { name: string }) => x.name).join(", ") || "",
            setupIds: t.setups?.map((s: { setupTypeId: string }) => s.setupTypeId) || [],
            confirmationIds: t.confirmations?.map((c: { confirmationTypeId: string }) => c.confirmationTypeId) || [],
          }));
          setImages(t.images || []);
          setTrader({
            energyLevel: t.energyLevel ?? 3,
            sleepHours: t.sleepHours != null ? String(t.sleepHours) : "",
            stressLevel: (t.stressLevel || "") as TraderStateValues["stressLevel"],
            stateMoodTag: t.stateMoodTag || "",
          });
          setBehavior(tradeToBehavior(t));
        }
      });
  }, [id]);

  useEffect(() => {
    fetch("/api/setup-types").then((r) => r.json()).then(setSetupTypes);
    fetch("/api/confirmation-types").then((r) => r.json()).then(setConfirmationTypes);
  }, []);

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
      ...behaviorPayloadFromForm(behavior),
    };
    const res = await fetch(`/api/trades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      const err = data.error || "Failed to update trade";
      setError(err);
      toast.error(err);
      return;
    }
    toast.success("Trade updated");
    router.push(`/dashboard/trades/${id}`);
    router.refresh();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    await uploadFiles(Array.from(files));
    e.target.value = "";
  }

  async function handleDeleteImage(imageId: string) {
    const res = await fetch(`/api/trades/${id}/images/${imageId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Screenshot removed");
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    }
  }

  async function handleAddImageLink() {
    const url = imageLinkInput.trim();
    if (!url) return;
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
    } catch {
      toast.error("Invalid image URL");
      return;
    }
    setUploading(true);
    const res = await fetch(`/api/trades/${id}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed to attach image link");
      return;
    }
    const created = Array.isArray(data) ? data : [];
    setImages((prev) => [...prev, ...created]);
    setImageLinkInput("");
    toast.success("Image link attached");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/trades/${id}`}
          className="text-slate-500 hover:text-white transition"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-bold text-white">Edit trade</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6"
      >
        {error && <div className="text-red-500 text-sm">{error}</div>}
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
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
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
          <p className="text-sm text-zinc-400">
            P&L:{" "}
            <span
              className={
                calculatedPnl >= 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"
              }
            >
              {calculatedPnl >= 0 ? "+" : ""}
              {calculatedPnl.toFixed(2)}
            </span>
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

        <TradeBehaviorFields
          values={behavior}
          onChange={(key, value) => setBehavior((b) => ({ ...b, [key]: value }))}
        />

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
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white resize-none"
          />
        </div>

        <TraderStateFields value={trader} onChange={setTrader} />

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Tags (comma-separated, Obsidian: #FakeOut)
          </label>
          <input
            name="tags"
            value={form.tags}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Notes
          </label>
          <p className="text-xs text-slate-500 mb-2">{tf.notesWikiEdit}</p>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white resize-none"
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
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImageLink())}
              placeholder="https://... TradingView screenshot URL"
              className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
            />
            <button
              type="button"
              onClick={handleAddImageLink}
              disabled={uploading || images.length >= 10}
              className="px-4 py-2 rounded-xl bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 disabled:opacity-50 transition text-sm"
            >
              Add link
            </button>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative group rounded-xl overflow-hidden bg-slate-800/80 border border-slate-700/80"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="block aspect-video w-full text-left cursor-zoom-in"
                  >
                    <img
                      src={img.url}
                      alt={img.caption || "Screenshot"}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  {img.caption && (
                    <p className="p-2 text-xs text-slate-400 truncate">{img.caption}</p>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(img.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-lg bg-red-900/80 text-red-400 text-xs hover:bg-red-900"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {lightboxIndex !== null && images.length > 0 && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
              onClick={() => setLightboxIndex(null)}
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl z-10"
                aria-label="Close"
              >
                ×
              </button>
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(
                        lightboxIndex > 0 ? lightboxIndex - 1 : images.length - 1
                      );
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-3xl z-10"
                    aria-label="Previous"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(
                        lightboxIndex < images.length - 1 ? lightboxIndex + 1 : 0
                      );
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-3xl z-10"
                    aria-label="Next"
                  >
                    ›
                  </button>
                </>
              )}
              <div
                className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={images[lightboxIndex].url}
                  alt={images[lightboxIndex].caption || "Screenshot"}
                  className="max-w-full max-h-[90vh] object-contain"
                />
              </div>
              {images.length > 1 && (
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-400 text-sm">
                  {lightboxIndex + 1} / {images.length}
                </p>
              )}
            </div>
          )}
          {imageError && <p className="text-red-500 text-sm mb-2">{imageError}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || images.length >= 10}
              className="px-4 py-2 rounded-xl bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 disabled:opacity-50 transition text-sm"
            >
              {uploading ? "Uploading..." : "Add screenshot"}
            </button>
            <span className="text-xs text-slate-500">
              or paste from clipboard (Ctrl+V / ⌘V)
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-all duration-200"
        >
          {loading ? "Saving..." : "Update trade"}
        </button>
      </form>
    </div>
  );
}
