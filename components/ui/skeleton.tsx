export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-slate-800/40 border border-slate-800/80 p-5 animate-pulse ${className}`}
    >
      <div className="h-4 w-20 rounded bg-slate-700/60" />
      <div className="h-8 w-24 rounded bg-slate-700/80 mt-3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
      <div className="bg-slate-900/80 p-4 space-y-2">
        <div className="h-4 rounded bg-slate-700/60 w-full" />
        <div className="h-4 rounded bg-slate-700/60 w-3/4" />
      </div>
      <div className="divide-y divide-slate-800/80">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            <div className="h-4 w-16 rounded bg-slate-700/40 animate-pulse" />
            <div className="h-4 flex-1 rounded bg-slate-700/40 animate-pulse" />
            <div className="h-4 w-12 rounded bg-slate-700/40 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 256 }: { height?: number }) {
  return (
    <div
      className="rounded-2xl bg-slate-800/40 border border-slate-800/80 p-5 animate-pulse"
      style={{ height }}
    >
      <div className="h-4 w-32 rounded bg-slate-700/60 mb-4" />
      <div className="h-[calc(100%-2rem)] rounded bg-slate-700/40" />
    </div>
  );
}

export function SkeletonTradeDetail() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="h-10 w-48 rounded bg-slate-700/60 animate-pulse" />
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 rounded bg-slate-700/60" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-16 rounded bg-slate-700/40" />
            ))}
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-3 w-16 rounded bg-slate-700/40 mb-2" />
              <div className="h-5 w-24 rounded bg-slate-700/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
