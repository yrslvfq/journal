"use client";

import { useEffect, useSyncExternalStore } from "react";

export type AppLanguage = "en" | "ru";

const STORAGE_KEY = "app-language";
const CHANGE_EVENT = "app-language-changed";

function readStored(): AppLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "ru" || v === "en") return v;
  } catch {
    /* private mode */
  }
  return "en";
}

function applyDocumentLang(lang: AppLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "ru" ? "ru" : "en";
}

export function subscribeToAppLanguage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  const onCustom = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onCustom);
  };
}

export function getAppLanguageSnapshot(): AppLanguage {
  return readStored();
}

export function getAppLanguageServerSnapshot(): AppLanguage {
  return "en";
}

export function setAppLanguage(lang: AppLanguage) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* quota / private */
  }
  applyDocumentLang(lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Subscribes to localStorage + cross-tab updates. Same-tab updates via setAppLanguage.
 */
export function useAppLanguage(): AppLanguage {
  return useSyncExternalStore(
    subscribeToAppLanguage,
    getAppLanguageSnapshot,
    getAppLanguageServerSnapshot
  );
}

/** Keeps <html lang> in sync with the current app language (client). */
export function useSyncDocumentLang() {
  const lang = useAppLanguage();
  useEffect(() => {
    applyDocumentLang(lang);
  }, [lang]);
}
