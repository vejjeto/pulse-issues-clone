"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme(): void {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      const value = next ? "dark" : "light";
      localStorage.setItem("pulse-theme", value);
      localStorage.setItem("theme", value);
    } catch {
      // ignore storage errors in restricted contexts
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className="inline-flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
      )}
    </button>
  );
}
