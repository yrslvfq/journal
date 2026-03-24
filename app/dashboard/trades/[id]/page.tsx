"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SkeletonTradeDetail } from "@/components/ui/skeleton";

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
  images: TradeImage[];
  setups: { setupType: { id: string; name: string } }[];
  confirmations: { confirmationType: { id: string; name: string } }[];
};

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageLinkInput, setImageLinkInput] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images = trade?.images ?? [];

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

  const refetchTrade = useCallback(() => {
    return fetch(`/api/trades/${id}`)
      .then((r) => r.json())
      .then((data) => setTrade(data));
  }, [id]);

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
      refetchTrade();
    },
    [id, refetchTrade]
  );

  useEffect(() => {
    fetch(`/api/trades/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTrade(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  async function handleDuplicate() {
    setDuplicating(true);
    const res = await fetch(`/api/trades/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    setDuplicating(false);
    if (res.ok) {
      toast.success("Trade duplicated");
      router.push(`/dashboard/trades/${data.id}`);
      router.refresh();
    } else {
      toast.error(data.error || "Failed to duplicate");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this trade?")) return;
    setDeleting(true);
    const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success("Trade deleted");
      router.push("/dashboard/trades");
      router.refresh();
    } else {
      toast.error("Failed to delete trade");
    }
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
      refetchTrade();
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
    setImageLinkInput("");
    toast.success("Image link attached");
    refetchTrade();
  }

  if (loading || !trade) {
    return loading ? <SkeletonTradeDetail /> : (
      <div className="text-slate-500 py-12 text-center">Trade not found</div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/trades"
          className="text-slate-500 hover:text-white transition"
        >
          ← Back to trades
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="px-4 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 disabled:opacity-50 transition text-sm"
          >
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>
          <Link
            href={`/dashboard/trades/${id}/edit`}
            className="px-4 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 transition text-sm"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
              {trade.symbol} — {trade.direction}
            </h1>
            <span
              className={`text-lg font-semibold ${
                trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trade.pnl >= 0 ? "+" : ""}
              {trade.pnl.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-400">
              {trade.instrumentType}
            </span>
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
                className="px-2 py-1 rounded-lg bg-blue-900/40 text-blue-400 text-xs"
              >
                {s.setupType.name}
              </span>
            ))}
            {trade.confirmations?.map((c) => (
              <span
                key={c.confirmationType.id}
                className="px-2 py-1 rounded-lg bg-emerald-900/40 text-emerald-400 text-xs"
              >
                {c.confirmationType.name}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Date</p>
            <p className="text-white font-medium">
              {trade.date ? new Date(trade.date).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Market condition</p>
            <p className="text-white font-medium">
              {trade.marketCondition
                ? trade.marketCondition.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Risk / R:R</p>
            <p className="text-white">
              ${trade.risk.toFixed(2)} / 1:{trade.rr}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Outcome</p>
            <p className="text-white">
              {trade.outcome === "win"
                ? "Take profit"
                : trade.outcome === "loss"
                ? "Stop loss"
                : "Break even"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Fees</p>
            <p className="text-white">{trade.fees.toFixed(2)}</p>
          </div>
        </div>

        {trade.confirmationNotes && (
          <div className="p-6 border-t border-slate-800/80">
            <h2 className="text-sm font-medium text-slate-400 mb-2">
              Confirmation notes
            </h2>
            <p className="text-slate-300 whitespace-pre-wrap">
              {trade.confirmationNotes}
            </p>
          </div>
        )}

        {trade.notes && (
          <div className="p-6 border-t border-slate-800/80">
            <h2 className="text-sm font-medium text-slate-400 mb-2">Notes</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{trade.notes}</p>
          </div>
        )}

        <div className="p-6 border-t border-slate-800/80">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Screenshots</h2>
          {(trade.images?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {(trade.images || []).map((img, idx) => (
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
                      setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : images.length - 1);
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
          <div className="flex gap-2 mb-3">
            <input
              value={imageLinkInput}
              onChange={(e) => setImageLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImageLink())}
              placeholder="https://... TradingView screenshot URL"
              className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
            />
            <button
              type="button"
              onClick={handleAddImageLink}
              disabled={uploading || (trade.images?.length ?? 0) >= 10}
              className="px-4 py-2 rounded-xl bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 disabled:opacity-50 transition text-sm"
            >
              Add link
            </button>
          </div>
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
              disabled={uploading || (trade.images?.length ?? 0) >= 10}
              className="px-4 py-2 rounded-xl bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 disabled:opacity-50 transition text-sm"
            >
              {uploading ? "Uploading..." : "Add screenshot"}
            </button>
            <span className="text-xs text-slate-500">
              or paste from clipboard (Ctrl+V / ⌘V)
            </span>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800/80">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-red-900/40 text-red-400 hover:bg-red-900/60 disabled:opacity-50 transition text-sm"
          >
            {deleting ? "Deleting..." : "Delete trade"}
          </button>
        </div>
      </div>
    </div>
  );
}
