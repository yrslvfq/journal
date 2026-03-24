type TabPlaceholderProps = {
  title: string;
  description: string;
};

export function AnalyticsTabPlaceholder({ title, description }: TabPlaceholderProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <p className="mt-4 text-xs text-slate-500">
        This tab shell is ready and uses the same global period filters as Overview.
      </p>
    </div>
  );
}
