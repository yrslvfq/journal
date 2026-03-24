"use client";

import { useSyncDocumentLang, useAppLanguage, setAppLanguage } from "@/lib/app-language";

export type { AppLanguage } from "@/lib/app-language";

/**
 * Wraps dashboard: syncs <html lang> with stored preference and exposes legacy hook API.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useSyncDocumentLang();
  return <>{children}</>;
}

export function useLanguage() {
  return {
    language: useAppLanguage(),
    setLanguage: setAppLanguage,
  };
}
