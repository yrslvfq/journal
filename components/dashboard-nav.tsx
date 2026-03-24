"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useLanguage } from "@/components/language-provider";

const nav = [
  { href: "/dashboard", label: { en: "Dashboard", ru: "Дашборд" } },
  { href: "/dashboard/prop-guard", label: { en: "Prop Guard", ru: "Prop Guard" } },
  { href: "/dashboard/trades", label: { en: "Trades", ru: "Сделки" } },
  { href: "/dashboard/trades/gallery", label: { en: "Trades Gallery", ru: "Галерея сделок" } },
  { href: "/dashboard/research", label: { en: "Research", ru: "Ресерч" } },
  { href: "/dashboard/research/gallery", label: { en: "Research Gallery", ru: "Галерея ресерча" } },
  { href: "/dashboard/analytics", label: { en: "Analytics", ru: "Аналитика" } },
  { href: "/dashboard/settings", label: { en: "Settings", ru: "Настройки" } },
];

export function DashboardNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/50 text-white backdrop-blur-sm"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-sm flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-slate-800/80">
          <Link href="/dashboard" className="text-lg font-semibold text-white tracking-tight">
            Flow Journal
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                {item.label[language]}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-2">
              {language === "ru" ? "Язык" : "Language"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition ${
                  language === "en"
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                    : "bg-slate-800/70 text-slate-300 border-slate-700/80"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ru")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs border transition ${
                  language === "ru"
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                    : "bg-slate-800/70 text-slate-300 border-slate-700/80"
                }`}
              >
                RU
              </button>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200"
          >
            {language === "ru" ? "Выйти" : "Sign out"}
          </button>
        </div>
      </aside>
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
