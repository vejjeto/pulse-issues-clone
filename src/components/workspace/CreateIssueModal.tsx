"use client";

import type { IssueWithLabels, LabelRow } from "@/db/schema";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
  TYPE_META,
} from "@/lib/constants";
import { Loader2, X } from "lucide-react";
import { type FormEvent, useState } from "react";

export interface CreateIssuePayload {
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  labelIds: number[];
}

interface CreateIssueModalProps {
  open: boolean;
  labels: LabelRow[];
  submitting: boolean;
  onClose: () => void;
  onCreateIssue: (payload: CreateIssuePayload) => Promise<IssueWithLabels>;
}

export function CreateIssueModal({
  open,
  labels,
  submitting,
  onClose,
  onCreateIssue,
}: CreateIssueModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<IssueStatus>("Todo");
  const [priority, setPriority] = useState<IssuePriority>("Medium");
  const [type, setType] = useState<IssueType>("feature");
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function toggleLabel(id: number): void {
    setSelectedLabels((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("El título es obligatorio.");
      return;
    }

    setError(null);
    try {
      await onCreateIssue({
        title: cleanTitle,
        description,
        status,
        priority,
        type,
        labelIds: selectedLabels,
      });
      setTitle("");
      setDescription("");
      setStatus("Todo");
      setPriority("Medium");
      setType("feature");
      setSelectedLabels([]);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el issue.",
      );
    }
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 backdrop-blur-sm"
      aria-modal="true"
      aria-labelledby="create-issue-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12141c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              ENG
            </span>
            <h2
              id="create-issue-title"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Nuevo Issue
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de creación"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-2 text-xs text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="new-issue-title"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Título
            </label>
            <input
              id="new-issue-title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Implementar caché de queries en Release Notes"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="new-issue-description"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Descripción (Markdown)
            </label>
            <textarea
              id="new-issue-description"
              rows={3}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto técnico, criterios de aceptación o pasos..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="new-issue-status"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Estado
              </label>
              <select
                id="new-issue-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as IssueStatus)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
              >
                {ISSUE_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="new-issue-priority"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Prioridad
              </label>
              <select
                id="new-issue-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as IssuePriority)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
              >
                {ISSUE_PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="new-issue-type"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Tipo
              </label>
              <select
                id="new-issue-type"
                value={type}
                onChange={(e) => setType(e.target.value as IssueType)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
              >
                {ISSUE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {TYPE_META[item].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Etiquetas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => {
                const active = selectedLabels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleLabel(label.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting && (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              )}
              <span>Crear Issue</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
