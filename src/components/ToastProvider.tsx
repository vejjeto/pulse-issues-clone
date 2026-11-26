"use client";

import { X } from "lucide-react";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  pushToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success:
    "border-emerald-500/40 bg-white dark:bg-[#11151c] text-zinc-900 dark:text-zinc-100",
  error:
    "border-rose-500/50 bg-white dark:bg-[#1a1114] text-zinc-900 dark:text-zinc-100",
  info: "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#11131a] text-zinc-900 dark:text-zinc-100",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { ...input, id }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4000);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const variant = toast.variant ?? "info";
          return (
            <output
              key={toast.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 shadow-lg ${VARIANT_CLASSES[variant]}`}
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Cerrar notificación"
                className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </output>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
