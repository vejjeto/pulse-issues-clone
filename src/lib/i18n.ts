"use client";

import { useCallback, useEffect, useState } from "react";

export type Locale = "es" | "en";

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_STORAGE_KEY = "pulse-lang";
export const LOCALE_CHANGE_EVENT = "pulse-lang-change";

export interface TranslationDictionary {
  landing: {
    badge: string;
    heroTitlePrefix: string;
    heroTitleHighlight: string;
    heroTitleSuffix: string;
    heroSubtitleBefore: string;
    heroSubtitleAfter: string;
    ctaEnter: string;
    ctaDone: string;
    card1Title: string;
    card1Desc: string;
    card2Title: string;
    card3Title: string;
    card3Footer: string;
  };
  footer: {
    disclaimer: string;
  };
  workspace: {
    title: string;
    visibleCount: string;
    releaseNotes: string;
    newIssue: string;
    searchPlaceholder: string;
    clearFilters: string;
    allStatuses: string;
    allPriorities: string;
    allTypes: string;
    allLabels: string;
    emptyTitle: string;
    emptySubtitle: string;
  };
}

export const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  es: {
    landing: {
      badge: "Issue Tracker de Ingeniería · Sin fricción ni login",
      heroTitlePrefix: "Triaje veloz estilo Linear,",
      heroTitleHighlight: "Focus Pomodoro",
      heroTitleSuffix: "y Release Notes en un clic.",
      heroSubtitleBefore:
        "PulseIssues combina flujo de ingeniería guiado por teclado, filtros compartibles en URL, temporizador Focus acoplado a cada issue y generación automática de",
      heroSubtitleAfter: "desde tus tareas completadas.",
      ctaEnter: "Entrar al Workspace Demo",
      ctaDone: "Ver issues completados",
      card1Title: "Focus Mode + Pomodoro Tracker",
      card1Desc:
        "Inicia bloques de 25m Pomodoro, 5m Sprint o Stopwatch directo en el drawer del issue. El tiempo real queda registrado en SQLite.",
      card2Title: "Generador de Release Notes",
      card3Title: "Atajos reales y URL compartible",
      card3Footer: "16 issues ENG-101..116 precargados",
    },
    footer: {
      disclaimer:
        "Proyecto educativo y de portafolio inspirado en Linear. No afiliado a la marca original.",
    },
    workspace: {
      title: "Workspace de Triaje",
      visibleCount: "visibles",
      releaseNotes: "Generar Release Notes",
      newIssue: "Nuevo Issue",
      searchPlaceholder: "Buscar issues (atajo / )...",
      clearFilters: "Limpiar filtros",
      allStatuses: "Estado: Todos",
      allPriorities: "Prioridad: Todas",
      allTypes: "Tipo: Todos",
      allLabels: "Etiqueta: Todas",
      emptyTitle: "No hay issues que coincidan con los filtros",
      emptySubtitle:
        "Prueba ajustando la búsqueda o limpia los filtros activos para ver todo el backlog.",
    },
  },
  en: {
    landing: {
      badge: "Engineering Issue Tracker · Zero friction, no login",
      heroTitlePrefix: "Fast Linear-style triage,",
      heroTitleHighlight: "Focus Pomodoro",
      heroTitleSuffix: "and one-click Release Notes.",
      heroSubtitleBefore:
        "PulseIssues combines keyboard-driven engineering workflows, shareable URL filters, an issue-coupled Focus timer, and automatic",
      heroSubtitleAfter: "generation from your completed tasks.",
      ctaEnter: "Enter Demo Workspace",
      ctaDone: "View completed issues",
      card1Title: "Focus Mode + Pomodoro Tracker",
      card1Desc:
        "Start 25m Pomodoro, 5m Sprint, or Stopwatch blocks right inside the issue drawer. Actual time is persisted in SQLite.",
      card2Title: "Release Notes Generator",
      card3Title: "Real shortcuts & shareable URLs",
      card3Footer: "16 preloaded ENG-101..116 issues",
    },
    footer: {
      disclaimer:
        "Educational & portfolio project inspired by Linear. Not affiliated with the original brand.",
    },
    workspace: {
      title: "Triage Workspace",
      visibleCount: "visible",
      releaseNotes: "Generate Release Notes",
      newIssue: "New Issue",
      searchPlaceholder: "Search issues (shortcut / )...",
      clearFilters: "Clear filters",
      allStatuses: "Status: All",
      allPriorities: "Priority: All",
      allTypes: "Type: All",
      allLabels: "Label: All",
      emptyTitle: "No issues match the active filters",
      emptySubtitle:
        "Try adjusting your search or clear active filters to view the full backlog.",
    },
  },
};

function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en";
}

export function useLocale(): {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: TranslationDictionary;
} {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) {
        setLocaleState(stored);
        document.documentElement.lang = stored;
      }
    } catch {
      // ignore storage errors in restricted contexts
    }

    function handleLocaleChange(event: Event): void {
      const detail = (event as CustomEvent<unknown>).detail;
      if (isLocale(detail)) {
        setLocaleState(detail);
        return;
      }
      try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (isLocale(stored)) {
          setLocaleState(stored);
        }
      } catch {
        // ignore storage errors
      }
    }

    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors in restricted contexts
    }
    window.dispatchEvent(
      new CustomEvent<Locale>(LOCALE_CHANGE_EVENT, { detail: next }),
    );
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "es" ? "en" : "es");
  }, [locale, setLocale]);

  return {
    locale,
    setLocale,
    toggleLocale,
    t: TRANSLATIONS[locale],
  };
}
