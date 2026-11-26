"use client";

import { useEffect, useState } from "react";

interface HealthState {
  status: "loading" | "ok" | "error";
  dbLatencyMs?: number;
}

export function HealthBadge() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = (await res.json()) as {
          status?: string;
          dbLatencyMs?: number;
        };
        if (!active) return;
        setHealth({
          status: res.ok && data.status === "ok" ? "ok" : "error",
          ...(typeof data.dbLatencyMs === "number"
            ? { dbLatencyMs: data.dbLatencyMs }
            : {}),
        });
      } catch {
        if (active) setHealth({ status: "error" });
      }
    }

    void checkHealth();
    const interval = setInterval(() => {
      void checkHealth();
    }, 30_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const dotClass =
    health.status === "ok"
      ? "bg-emerald-500"
      : health.status === "error"
        ? "bg-rose-500"
        : "bg-amber-400 animate-pulse";

  const label =
    health.status === "ok"
      ? `API OK${typeof health.dbLatencyMs === "number" ? ` · ${health.dbLatencyMs}ms` : ""}`
      : health.status === "error"
        ? "API Degraded"
        : "Checking API";

  return (
    <span
      title="Estado del servicio (/api/health)"
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900 px-2.5 py-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-300"
    >
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
