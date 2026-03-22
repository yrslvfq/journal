"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

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

const MAX_IMAGES = 10;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const SORT_OPTIONS = [
  { value: "updated-desc", label: "Newest first" },
  { value: "updated-asc", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
  { value: "type", label: "By type" },
] as const;

function EntrySkeleton() {
  return (
    <div className="rounded-xl bg-slate-800/40 animate-pulse p-4 space-y-2">
      <div className="h-4 bg-slate-700/60 rounded w-3/4" />
      <div className="h-3 bg-slate-700/40 rounded w-1/2" />
    </div>
  );
}

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const entryIdFromUrl = searchParams.get("entry");
  const [entries, setEntries] = useState<ResearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("updated-desc");
  const [selected, setSelected] = useState<ResearchEntry | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<"note" | "setup" | "strategy">("note");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createType, setCreateType] = useState<"note" | "setup" | "strategy">("note");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (typeFilter) params.set("type", typeFilter);
    fetch(`/api/research?${params}`)
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [search, typeFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (entryIdFromUrl && entries.length > 0 && !selected) {
      const found = entries.find((e) => e.id === entryIdFromUrl);
      if (found) {
        setSelected(found);
        setEditTitle(found.title);
        setEditContent(found.content);
        setEditType(found.type);
      }
    }
  }, [entryIdFromUrl, entries, selected]);

  const sortedEntries = [...entries].sort((a, b) => {
    switch (sort) {
      case "updated-desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "updated-asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "title":
        return a.title.localeCompare(b.title);
      case "type":
        return a.type.localeCompare(b.type) || a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const stats = {
    note: entries.filter((e) => e.type === "note").length,
    setup: entries.filter((e) => e.type === "setup").length,
    strategy: entries.filter((e) => e.type === "strategy").length,
  };

  function openEntry(entry: ResearchEntry) {
    setSelected(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setEditType(entry.type);
  }

  const addImages = useCallback((files: File[]) => {
    const valid = files.filter((f) => f.type && ALLOWED_IMAGE_TYPES.includes(f.type));
    if (valid.length === 0) return;
    return valid;
  }, []);

  const handleAddImages = useCallback(
    async (files: FileList | File[]) => {
      if (!selected) return;
      const fileArr = Array.from(files);
      const valid = addImages(fileArr);
      if (!valid || valid.length === 0) {
        toast.error("Allowed: PNG, JPEG, WebP");
        return;
      }
      const current = selected.images?.length ?? 0;
      if (current + valid.length > MAX_IMAGES) {
        toast.error(`Max ${MAX_IMAGES} screenshots per entry`);
        return;
      }
      setUploadingImages(true);
      const formData = new FormData();
      valid.forEach((f) => formData.append("files", f));
      try {
        const res = await fetch(`/api/research/${selected.id}/images`, {
          method: "POST",
          body: formData,
        });
        const created = await res.json();
        if (res.ok && Array.isArray(created)) {
          setSelected((s) =>
            s ? { ...s, images: [...(s.images ?? []), ...created] } : s
          );
          toast.success("Screenshot(s) added");
        } else {
          toast.error(created?.error ?? "Failed to add");
        }
      } catch {
        toast.error("Failed to add screenshots");
      } finally {
        setUploadingImages(false);
      }
    },
    [selected?.id, selected?.images?.length, addImages]
  );

  async function handleRemoveImage(imageId: string) {
    if (!selected) return;
    const res = await fetch(
      `/api/research/${selected.id}/images/${imageId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setSelected((s) =>
        s ? { ...s, images: (s.images ?? []).filter((i) => i.id !== imageId) } : s
      );
      toast.success("Removed");
    } else {
      toast.error("Failed to remove");
    }
  }

  function closeEditor() {
    setSelected(null);
    setCreating(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/research/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        content: editContent,
        type: editType,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Saved");
      const updated = await res.json();
      setSelected({ ...updated, images: selected.images });
      fetchEntries();
    } else {
      toast.error("Failed to save");
    }
  }

  async function handleDelete() {
    if (!selected || !confirm("Delete this entry?")) return;
    setSaving(true);
    const res = await fetch(`/api/research/${selected.id}`, {
      method: "DELETE",
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Deleted");
      closeEditor();
      fetchEntries();
    } else {
      toast.error("Failed to delete");
    }
  }

  async function handleDuplicate() {
    if (!selected) return;
    setDuplicating(true);
    const res = await fetch(`/api/research/${selected.id}/duplicate`, {
      method: "POST",
    });
    const data = await res.json();
    setDuplicating(false);
    if (res.ok) {
      toast.success("Duplicated");
      fetchEntries();
      openEntry({ ...data, images: data.images ?? [] });
    } else {
      toast.error("Failed to duplicate");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setSaving(true);
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: createTitle.trim(),
        content: createContent,
        type: createType,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      toast.success("Created");
      setCreating(false);
      setCreateTitle("");
      setCreateContent("");
      setCreateType("note");
      fetchEntries();
      openEntry({ ...data, images: data.images ?? [] });
    } else {
      toast.error("Failed to create");
    }
  }

  useEffect(() => {
    if (!selected) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEditor();
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.closest("input") ||
        target?.closest("textarea") ||
        target?.closest("[contenteditable]")
      )
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
        handleAddImages(files);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [selected?.id, handleAddImages]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <div className="lg:w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-3xl font-bold text-white">Research</h1>
          <Link
            href="/dashboard/research/gallery"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Gallery
          </Link>
        </div>
        <p className="text-sm text-slate-500">
          Notes, setup descriptions, and strategy notes — your trading knowledge base.
        </p>

        {(stats.note > 0 || stats.setup > 0 || stats.strategy > 0) && (
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-slate-400">
              {stats.note} notes
            </span>
            <span className="px-2 py-1 rounded-lg bg-amber-900/30 text-amber-500/80">
              {stats.setup} setups
            </span>
            <span className="px-2 py-1 rounded-lg bg-blue-900/30 text-blue-500/80">
              {stats.strategy} strategies
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
          />
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All types</option>
              <option value="note">Note</option>
              <option value="setup">Setup</option>
              <option value="strategy">Strategy</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition"
        >
          + New entry
        </button>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            [...Array(5)].map((_, i) => <EntrySkeleton key={i} />)
          ) : sortedEntries.length === 0 ? (
            <div className="text-slate-500 text-sm py-4">
              No entries yet. Create one to get started.
            </div>
          ) : (
            sortedEntries.map((e) => (
              <button
                key={e.id}
                onClick={() => openEntry(e)}
                className={`w-full text-left px-4 py-3 rounded-xl transition border ${
                  selected?.id === e.id
                    ? "bg-blue-600/20 border-blue-500/40 text-white"
                    : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="font-medium truncate">{e.title}</div>
                {e.content && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {e.content.replace(/\n/g, " ").slice(0, 80)}
                    {e.content.length > 80 ? "…" : ""}
                  </p>
                )}
                <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded ${TYPE_COLORS[e.type]}`}>
                    {TYPE_LABELS[e.type]}
                  </span>
                  <span>{new Date(e.updatedAt).toLocaleDateString()}</span>
                  {(e.images?.length ?? 0) > 0 && (
                    <span className="text-slate-600">📷 {e.images!.length}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 overflow-y-auto">
        {creating ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <h2 className="text-xl font-semibold text-white">New entry</h2>
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Title"
              required
              className="w-full px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            />
            <select
              value={createType}
              onChange={(e) => setCreateType(e.target.value as typeof createType)}
              className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="note">Note</option>
              <option value="setup">Setup</option>
              <option value="strategy">Strategy</option>
            </select>
            <textarea
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder="Content (supports markdown)"
              rows={16}
              className="w-full px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50 font-mono text-sm resize-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !createTitle.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="px-4 py-2 rounded-xl bg-slate-700/80 text-slate-300 hover:bg-slate-600/80"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-white truncate">
                {selected.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  ⌘S save · Esc close
                </span>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {new Date(selected.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            />
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as typeof editType)}
              className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="note">Note</option>
              <option value="setup">Setup</option>
              <option value="strategy">Strategy</option>
            </select>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Content (supports markdown)"
              rows={20}
              className="w-full px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50 font-mono text-sm resize-none"
            />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files;
                if (f?.length) handleAddImages(f);
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-400">Screenshots</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files;
                    if (f?.length) handleAddImages(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    uploadingImages ||
                    (selected.images?.length ?? 0) >= MAX_IMAGES
                  }
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 disabled:opacity-50"
                >
                  {uploadingImages ? "Uploading..." : "+ Add screenshot"}
                </button>
                <span className="text-xs text-slate-500">
                  Paste or drag & drop · max {MAX_IMAGES}
                </span>
              </div>
              {(selected.images?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.images?.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-lg overflow-hidden border border-slate-700/60"
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="h-24 w-auto object-cover max-w-[200px]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="absolute top-1 right-1 p-1 rounded bg-red-600/90 text-white text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="px-4 py-2 rounded-xl bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 disabled:opacity-50"
              >
                {duplicating ? "..." : "Duplicate"}
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30"
              >
                Delete
              </button>
              <Link
                href={`/dashboard/research/gallery?entry=${selected.id}`}
                className="px-4 py-2 rounded-xl bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 inline-block"
              >
                View in gallery
              </Link>
              <button
                onClick={closeEditor}
                className="px-4 py-2 rounded-xl bg-slate-700/80 text-slate-300 hover:bg-slate-600/80"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="mb-1">Select an entry or create a new one</p>
            <Link href="/dashboard/research/gallery" className="text-blue-400 hover:text-blue-300 text-sm">
              Or browse in gallery view
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
