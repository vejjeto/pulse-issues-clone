"use client";

import { MarkdownPreview } from "@/components/MarkdownPreview";
import { formatDuration } from "@/lib/changelog";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useState } from "react";

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChangelogResponse {
  markdown: string;
  count: number;
  totalTimeSeconds: number;
}

function defaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 86_400_000);
  return {
    from: past.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  const initialRange = defaultDateRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [version, setVersion] = useState("v1.4.0");
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const changelogQuery = useQuery<ChangelogResponse>({
    queryKey: ["changelog", from, to, version.trim()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (version.trim()) params.set("version", version.trim());

      const response = await fetch(`/api/changelog?${params.toString()}`);
      if (!response.ok) {
        throw new Error(
          "Error al generar las Release Notes. Intenta de nuevo.",
        );
      }
      return (await response.json()) as ChangelogResponse;
    },
    enabled: open,
  });

  if (!open) return null;

  const data = changelogQuery.data ?? null;
  const loading = changelogQuery.isFetching;
  const error =
    copyError ??
    (changelogQuery.isError
      ? "Error al generar las Release Notes. Intenta de nuevo."
      : null);

  async function handleCopy(): Promise<void> {
    if (!data?.markdown) return;
    try {
      await navigator.clipboard.writeText(data.markdown);
      setCopyError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("No se pudo copiar al portapapeles.");
    }
  }

  function handleDownload(): void {
    if (!data?.markdown) return;
    const blob = new Blob([data.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "CHANGELOG.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center border-0 bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12141c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" aria-hidden="true" />
            <h2
              id="changelog-modal-title"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Generador automático de Release Notes
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar generador de Release Notes"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 px-5 py-3 sm:grid-cols-4">
          <div>
            <label
              htmlFor="changelog-version"
              className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1"
            >
              Versión
            </label>
            <input
              id="changelog-version"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="changelog-from"
              className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1"
            >
              Desde
            </label>
            <input
              id="changelog-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="changelog-to"
              className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1"
            >
              Hasta
            </label>
            <input
              id="changelog-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void changelogQuery.refetch()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 px-5 py-2.5 text-xs">
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
            <span>
              Completados:{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {data?.count ?? 0}
              </strong>
            </span>
            <span>
              Focus acumulado:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {formatDuration(data?.totalTimeSeconds ?? 0)}
              </strong>
            </span>
          </div>

          <div className="inline-flex rounded-md border border-zinc-200 dark:border-zinc-700 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                viewMode === "preview"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Vista previa
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                viewMode === "raw"
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Markdown
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-zinc-500">
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Compilando Release Notes...
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-4 text-xs text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          ) : data ? (
            viewMode === "preview" ? (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4">
                <MarkdownPreview content={data.markdown} />
              </div>
            ) : (
              <pre className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
                {data.markdown}
              </pre>
            )
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 px-5 py-3">
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!data?.markdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {copied ? (
              <Check
                className="h-3.5 w-3.5 text-emerald-500"
                aria-hidden="true"
              />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{copied ? "Copiado" : "Copiar Markdown"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!data?.markdown}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Descargar CHANGELOG.md</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
