"use client";

import { useLocale } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { locale, toggleLocale } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label="Cambiar idioma (ES/EN)"
      title={locale === "es" ? "Switch to English" : "Cambiar a Español"}
      className="inline-flex items-center justify-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      <Globe
        className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400"
        aria-hidden="true"
      />
      <span>{locale.toUpperCase()}</span>
    </button>
  );
}
