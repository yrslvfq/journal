"use client";

import { useEffect, useState } from "react";
import { useAppLanguage } from "@/lib/app-language";
import { LanguageSwitcher } from "@/components/language-switcher";

type SetupType = {
  id: string;
  name: string;
  description: string | null;
  userId: string | null;
  userDescription: string | null;
};
type ConfirmationType = { id: string; name: string; userId: string | null };

function SetupTypeItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: SetupType;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editDesc, setEditDesc] = useState(
    (item.userId ? item.description : item.userDescription) ?? ""
  );
  const [loading, setLoading] = useState(false);

  const isCustom = !!item.userId;
  const displayDesc = item.userId ? item.description : item.userDescription;

  async function handleSave() {
    setLoading(true);
    const res = await fetch(`/api/setup-types/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(isCustom ? { name: editName.trim() } : {}),
        description: editDesc.trim() || null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setEditing(false);
      onUpdate();
    }
  }

  async function handleDelete() {
    if (
      !confirm("Delete this type? Trades using it will lose this association.")
    )
      return;
    setLoading(true);
    const res = await fetch(`/api/setup-types/${item.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) onUpdate();
  }

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        {editing ? (
          <div className="flex-1 min-w-0 space-y-2">
            {isCustom && (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-1.5 rounded-lg text-sm bg-slate-900/80 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500/50"
              />
            )}
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder={isCustom ? "Description" : "Your notes for this setup"}
              rows={2}
              className="w-full px-3 py-1.5 rounded-lg text-sm bg-slate-900/80 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading || (isCustom && !editName.trim())}
                className="px-2 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditName(item.name);
                  setEditDesc(displayDesc ?? "");
                  setEditing(false);
                }}
                disabled={loading}
                className="px-2 py-1 rounded-lg text-xs bg-slate-700/80 text-slate-300 hover:bg-slate-600/80"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <span
              className={`px-3 py-1.5 rounded-xl text-sm ${
                isCustom
                  ? "bg-slate-700/60 text-slate-300"
                  : "bg-slate-800/80 text-slate-400"
              }`}
            >
              {item.name}
            </span>
            {displayDesc && (
              <span className="text-xs text-slate-500 max-w-xs truncate" title={displayDesc}>
                {displayDesc}
              </span>
            )}
            <button
              onClick={() => setEditing(true)}
              disabled={loading}
              className="text-blue-400 hover:text-blue-300 text-xs transition"
            >
              {displayDesc ? "Edit" : "Add description"}
            </button>
            {isCustom && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EditableConfirmationItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: ConfirmationType;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.name);
  const [loading, setLoading] = useState(false);

  const isCustom = !!item.userId;

  async function handleSave() {
    if (editValue.trim() === item.name) {
      setEditing(false);
      return;
    }
    if (!editValue.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/confirmation-types/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editValue.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      setEditing(false);
      onUpdate();
    }
  }

  async function handleDelete() {
    if (
      !confirm("Delete this type? Trades using it will lose this association.")
    )
      return;
    setLoading(true);
    const res = await fetch(`/api/confirmation-types/${item.id}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) onUpdate();
  }

  if (!isCustom) {
    return (
      <span className="px-3 py-1.5 rounded-xl text-sm bg-slate-800/80 text-slate-400">
        {item.name}
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="px-3 py-1.5 rounded-xl text-sm bg-slate-800/80 border border-slate-600 text-white w-40 focus:ring-2 focus:ring-blue-500/50"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={loading || !editValue.trim()}
          className="px-2 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => {
            setEditValue(item.name);
            setEditing(false);
          }}
          disabled={loading}
          className="px-2 py-1 rounded-lg text-xs bg-slate-700/80 text-slate-300 hover:bg-slate-600/80"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-700/60 text-slate-300 text-sm">
      <span>{item.name}</span>
      <button
        onClick={() => setEditing(true)}
        disabled={loading}
        className="text-blue-400 hover:text-blue-300 text-xs transition"
      >
        Edit
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-red-400 hover:text-red-300 text-xs"
      >
        Delete
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const language = useAppLanguage();
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([]);
  const [confirmationTypes, setConfirmationTypes] = useState<ConfirmationType[]>(
    []
  );
  const [newSetup, setNewSetup] = useState("");
  const [newSetupDesc, setNewSetupDesc] = useState("");
  const [newConfirmation, setNewConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchTypes() {
    const [setups, confs] = await Promise.all([
      fetch("/api/setup-types").then((r) => r.json()),
      fetch("/api/confirmation-types").then((r) => r.json()),
    ]);
    setSetupTypes(setups);
    setConfirmationTypes(confs);
  }

  useEffect(() => {
    fetchTypes();
  }, []);

  async function addSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!newSetup.trim()) return;
    setLoading(true);
    const res = await fetch("/api/setup-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSetup.trim(),
        description: newSetupDesc.trim() || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setNewSetup("");
      setNewSetupDesc("");
      fetchTypes();
    }
  }

  async function addConfirmation(e: React.FormEvent) {
    e.preventDefault();
    if (!newConfirmation.trim()) return;
    setLoading(true);
    const res = await fetch("/api/confirmation-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newConfirmation.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      setNewConfirmation("");
      fetchTypes();
    }
  }

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold text-white">Settings</h1>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6">
        <h2 className="text-lg font-medium text-white mb-2">
          {language === "ru" ? "Язык" : "Language"}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {language === "ru"
            ? "Меняется в любой момент: сверху справа на телефоне или внизу меню. Сохраняется в этом браузере."
            : "Change anytime: top-right on mobile or bottom of the sidebar. Saved in this browser."}
        </p>
        <div className="max-w-xs">
          <LanguageSwitcher size="md" />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6">
        <h2 className="text-lg font-medium text-white mb-4">Setup types</h2>
        <p className="text-sm text-slate-500 mb-4">
          Add custom setup types and add descriptions or personal notes to any
          setup (including system ones).
        </p>
        <form onSubmit={addSetup} className="space-y-2 mb-4">
          <div className="flex gap-2">
            <input
              value={newSetup}
              onChange={(e) => setNewSetup(e.target.value)}
              placeholder="New setup type"
              className="flex-1 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              Add
            </button>
          </div>
          <input
            value={newSetupDesc}
            onChange={(e) => setNewSetupDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
          />
        </form>
        <div className="flex flex-col gap-2">
          {setupTypes.map((t) => (
            <SetupTypeItem
              key={t.id}
              item={t}
              onUpdate={fetchTypes}
              onDelete={fetchTypes}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6">
        <h2 className="text-lg font-medium text-white mb-4">
          Confirmation types
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Add custom confirmation types (e.g. absorption in DOM, Bookmap). You
          can edit and delete only your own types.
        </p>
        <form onSubmit={addConfirmation} className="flex gap-2 mb-4">
          <input
            value={newConfirmation}
            onChange={(e) => setNewConfirmation(e.target.value)}
            placeholder="New confirmation type"
            className="flex-1 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition"
          >
            Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {confirmationTypes.map((t) => (
            <EditableConfirmationItem
              key={t.id}
              item={t}
              onUpdate={fetchTypes}
              onDelete={fetchTypes}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
