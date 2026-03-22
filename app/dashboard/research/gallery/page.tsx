"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ResearchImage = { id: string; url: string; caption: string | null };

type ResearchEntry = {
  id: string;
  title: string;
  content: string;
  type: "note" | "setup" | "strategy";
  createdAt: string;
  updatedAt: string;
  images?: ResearchImage[];
};

const TYPE_LABELS: Record<string, string> = {
  note: "Note",
  setup: "Setup",
  strategy: "Strategy",
};

const TYPE_COLORS: Record<string, string> = {
  note: "bg-slate-700/60 text-slate-300",
  setup: "bg-amber-900/40 text-amber-400",
  strategy: "bg-blue-900/40 text-blue-400",
};

function groupByType(entries: ResearchEntry[]) {
  const groups: Record<string, ResearchEntry[]> = {};
  for (const e of entries) {
    if (!groups[e.type]) groups[e.type] = [];
    groups[e.type].push(e);
  }
  const order = ["setup", "strategy", "note"];
  return order.filter((t) => groups[t]?.length).map((t) => ({
    type: t,
    label: TYPE_LABELS[t],
    entries: groups[t].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  }));
}

export default function ResearchGalleryPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("entry");
  const [entries, setEntries] = useState<ResearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [selected, setSelected] = useState<ResearchEntry | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    fetch(`/api/research?${params}`)
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => {
    if (highlightId && entries.length > 0 && !selected) {
      const found = entries.find((e) => e.id === highlightId);
      if (found) setSelected(found);
    }
  }, [highlightId, entries, selected]);

  const filteredEntries = onlyWithImages
    ? entries.filter((e) => (e.images?.length ?? 0) > 0)
    : entries;
  const groups = groupByType(filteredEntries);

  const handleLightboxKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxImg(null);
    },
    []
  );
  useEffect(() => {
    if (lightboxImg) {
      window.addEventListener("keydown", handleLightboxKey);
      return () => window.removeEventListener("keydown", handleLightboxKey);
    }
  }, [lightboxImg, handleLightboxKey]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Research Gallery
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">All types</option>
            <option value="note">Notes</option>
            <option value="setup">Setups</option>
            <option value="strategy">Strategies</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyWithImages}
              onChange={(e) => setOnlyWithImages(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-blue-500"
            />
            With images only
          </label>
          <Link
            href="/dashboard/research"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-all duration-200"
          >
            + New entry
          </Link>
          <Link
            href="/dashboard/research"
            className="px-4 py-2 rounded-xl bg-slate-700/80 text-white hover:bg-slate-600/80 transition"
          >
            List view
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
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <p className="text-slate-400 mb-2">No research entries yet</p>
          <Link href="/dashboard/research" className="text-blue-400 hover:text-blue-300">
            Create your first entry
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map(({ type, label, entries: groupEntries }) => (
            <section key={type}>
              <h2 className="text-lg font-semibold text-slate-300 mb-4 sticky top-0 py-2 bg-[#080c14]/95 backdrop-blur-sm z-10 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-sm ${TYPE_COLORS[type]}`}>
                  {label}
                </span>
                <span className="text-slate-500 text-sm">{groupEntries.length} entries</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {groupEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => setSelected(entry)}
                    onImageClick={(url) => setLightboxImg(url)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected && (
        <EntryModal
          entry={selected}
          onClose={() => setSelected(null)}
          onImageClick={(url) => setLightboxImg(url)}
        />
      )}

      {lightboxImg && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxImg(null)}
          role="button"
          tabIndex={0}
          aria-label="Close lightbox"
        >
          <img
            src={lightboxImg}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white flex items-center justify-center text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function EntryCard({
  entry,
  onClick,
  onImageClick,
}: {
  entry: ResearchEntry;
  onClick: () => void;
  onImageClick: (url: string) => void;
}) {
  const thumb = entry.images?.[0]?.url;
  const contentPreview = entry.content?.replace(/\n/g, " ").slice(0, 60) || "";
  const dateStr = new Date(entry.updatedAt).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
  });

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
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(thumb);
            }}
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        )}
        {(entry.images?.length ?? 0) > 1 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-slate-900/90 text-xs text-slate-300">
            📷 {entry.images!.length}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-semibold text-white truncate">{entry.title}</span>
          <span className="text-xs text-slate-500 shrink-0">{dateStr}</span>
        </div>
        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${TYPE_COLORS[entry.type]}`}>
          {TYPE_LABELS[entry.type]}
        </span>
        {contentPreview && (
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{contentPreview}…</p>
        )}
      </div>
    </button>
  );
}

function EntryModal({
  entry,
  onClose,
  onImageClick,
}: {
  entry: ResearchEntry;
  onClose: () => void;
  onImageClick: (url: string) => void;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const dateStr = new Date(entry.updatedAt).toLocaleDateString("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-4 sm:inset-8 lg:inset-16 z-50 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4" onClick={onClose}>
          <div
            className="w-full max-w-2xl rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {entry.images?.[0]?.url ? (
                <div
                  className="aspect-video bg-slate-800 cursor-pointer"
                  onClick={() => onImageClick(entry.images![0].url)}
                >
                  <img
                    src={entry.images[0].url}
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
              <div>
                <h2 className="text-2xl font-bold text-white">{entry.title}</h2>
                <p className="text-slate-400 text-sm mt-1">{dateStr}</p>
                <span className={`inline-block mt-2 px-2 py-1 rounded-lg text-sm ${TYPE_COLORS[entry.type]}`}>
                  {TYPE_LABELS[entry.type]}
                </span>
              </div>

              {(entry.images?.length ?? 0) > 0 && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                    Screenshots
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.images?.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => onImageClick(img.url)}
                        className="rounded-lg overflow-hidden border border-slate-700/60 hover:border-slate-500/60 transition max-w-[120px]"
                      >
                        <img
                          src={img.url}
                          alt=""
                          className="h-20 w-auto object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {entry.content && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                    Content
                  </p>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {entry.content}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <Link
                  href={`/dashboard/research?entry=${entry.id}`}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-center hover:bg-blue-500 transition"
                >
                  Edit entry
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
