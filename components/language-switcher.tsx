"use client";

import { useAppLanguage, setAppLanguage, type AppLanguage } from "@/lib/app-language";

type Props = {
  /** compact for nav / mobile bar */
  size?: "sm" | "md";
  className?: string;
  /** show "Language" label (sidebar) */
  showLabel?: boolean;
};

export function LanguageSwitcher({ size = "md", className = "", showLabel = false }: Props) {
  const language = useAppLanguage();
  const isSm = size === "sm";
  const groupLabel =
    language === "ru" ? "Язык интерфейса" : "Interface language";

  const segment = (code: AppLanguage, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={language === code}
      onClick={() => setAppLanguage(code)}
      className={`flex-1 font-medium rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
        isSm ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${
        language === code
          ? "bg-slate-700 text-white shadow-sm"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={className}>
      {showLabel && (
        <p className="text-xs text-slate-500 mb-2" id="language-switcher-label">
          {language === "ru" ? "Язык интерфейса" : "Interface language"}
        </p>
      )}
      <div
        className={`inline-flex w-full rounded-lg border border-slate-700/80 bg-slate-900/80 p-0.5 ${
          isSm ? "gap-0.5" : "gap-1"
        }`}
        role="radiogroup"
        aria-labelledby={showLabel ? "language-switcher-label" : undefined}
        aria-label={showLabel ? undefined : groupLabel}
      >
        {segment("en", "EN")}
        {segment("ru", "RU")}
      </div>
    </div>
  );
}
