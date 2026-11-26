"use client";

import { MarkdownPreview } from "@/components/MarkdownPreview";
import { StatusIcon } from "@/components/StatusAndPriorityIcons";
import type { FocusSessionRow, IssueWithLabels, LabelRow } from "@/db/schema";
import { formatDuration } from "@/lib/changelog";
import {
  type FocusMode,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
  TYPE_META,
} from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Save,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type TimerPreset = "pomodoro25" | "sprint5" | "stopwatch";

const PRESET_SECONDS: Record<TimerPreset, number> = {
  pomodoro25: 1500,
  sprint5: 300,
  stopwatch: 0,
};

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface FocusTimerWidgetProps {
  issueId: number;
  timeSpentSeconds: number;
  onRecordSession: (payload: {
    durationSeconds: number;
    mode: FocusMode;
  }) => Promise<{ issue: IssueWithLabels; session: FocusSessionRow }>;
}

function FocusTimerWidget({
  issueId,
  timeSpentSeconds,
  onRecordSession,
}: FocusTimerWidgetProps) {
  const [focusOpen, setFocusOpen] = useState(false);
  const [preset, setPreset] = useState<TimerPreset>("pomodoro25");
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset timer state when switching issueId
  useEffect(() => {
    setRunning(false);
    setElapsedSeconds(0);
    setStatusMsg(null);
  }, [issueId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const targetSeconds = PRESET_SECONDS[preset];
  const displaySeconds =
    preset === "stopwatch"
      ? elapsedSeconds
      : Math.max(0, targetSeconds - elapsedSeconds);
  const mode: FocusMode = preset === "stopwatch" ? "stopwatch" : "pomodoro";

  function selectPreset(next: TimerPreset): void {
    setPreset(next);
    setRunning(false);
    setElapsedSeconds(0);
    setStatusMsg(null);
  }

  async function handleCompleteAndSave(): Promise<void> {
    const secondsToRecord =
      elapsedSeconds > 0
        ? elapsedSeconds
        : preset === "stopwatch"
          ? 60
          : targetSeconds;

    setSaving(true);
    setStatusMsg(null);
    try {
      await onRecordSession({ durationSeconds: secondsToRecord, mode });
      setRunning(false);
      setElapsedSeconds(0);
      setStatusMsg(`+${formatDuration(secondsToRecord)} registrado en SQLite`);
    } catch (err) {
      setStatusMsg(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la sesión Focus.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Timer
            className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Focus Mode · Pomodoro
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Acumulado: <strong>{formatDuration(timeSpentSeconds)}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setFocusOpen(true);
            setRunning((prev) => (focusOpen ? !prev : true));
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          {focusOpen && running ? (
            <>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pausar Focus</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Iniciar sesión Focus</span>
            </>
          )}
        </button>
      </div>

      {focusOpen && (
        <div className="space-y-3 border-t border-indigo-200/80 dark:border-indigo-900/60 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "pomodoro25", label: "Pomodoro 25m" },
                { id: "sprint5", label: "Sprint 5m" },
                { id: "stopwatch", label: "Stopwatch" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectPreset(tab.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  preset === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
            <span
              aria-live="polite"
              className="font-mono text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {formatClock(displaySeconds)}
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setElapsedSeconds(0);
                }}
                aria-label="Reiniciar temporizador Focus"
                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleCompleteAndSave()}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Completar y Registrar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {statusMsg && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {statusMsg}
        </p>
      )}
    </div>
  );
}

interface IssueDetailDrawerProps {
  issue: IssueWithLabels | null;
  allLabels: LabelRow[];
  isMutating: boolean;
  onClose: () => void;
  onUpdateIssue: (
    id: number,
    patch: Record<string, unknown>,
  ) => Promise<IssueWithLabels>;
  onDeleteIssue: (id: number) => Promise<number>;
  onRecordFocusSession: (
    issueId: number,
    payload: { durationSeconds: number; mode: FocusMode },
  ) => Promise<{ issue: IssueWithLabels; session: FocusSessionRow }>;
}

export function IssueDetailDrawer({
  issue,
  allLabels,
  isMutating,
  onClose,
  onUpdateIssue,
  onDeleteIssue,
  onRecordFocusSession,
}: IssueDetailDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingText, setEditingText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!issue) return;
    setTitle(issue.title);
    setDescription(issue.description);
    setEditingText(false);
    setError(null);
  }, [issue]);

  const detailQuery = useQuery<{ sessions: FocusSessionRow[] }>({
    queryKey: ["issue-detail", issue?.id ?? null],
    queryFn: async () => {
      const res = await fetch(`/api/issues/${issue!.id}`);
      if (!res.ok) throw new Error("No se pudo cargar el historial Focus.");
      return (await res.json()) as { sessions: FocusSessionRow[] };
    },
    enabled: Boolean(issue && issue.id > 0),
  });

  if (!issue) return null;

  const sessions = detailQuery.data?.sessions ?? [];
  const saving = isMutating;

  async function patchIssue(patch: Record<string, unknown>): Promise<void> {
    if (!issue) return;
    setError(null);
    try {
      await onUpdateIssue(issue.id, patch);
      setEditingText(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el issue.",
      );
    }
  }

  async function handleDelete(): Promise<void> {
    if (!issue) return;
    setError(null);
    try {
      await onDeleteIssue(issue.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el issue.",
      );
    }
  }

  function toggleLabel(labelId: number): void {
    if (!issue) return;
    const currentIds = issue.labels.map((item) => item.id);
    const nextIds = currentIds.includes(labelId)
      ? currentIds.filter((id) => id !== labelId)
      : [...currentIds, labelId];
    void patchIssue({ labelIds: nextIds });
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-40 m-0 flex h-full w-full max-w-none justify-end border-0 bg-black/50 p-0 backdrop-blur-[1px]"
      aria-modal="true"
      aria-labelledby="drawer-issue-id"
    >
      <div className="flex h-full w-full max-w-xl flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <StatusIcon status={issue.status} />
            <span
              id="drawer-issue-id"
              className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400"
            >
              {issue.identifier}
            </span>
            {issue.completedAt && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Completado {issue.completedAt.slice(0, 10)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
              aria-label="Eliminar issue"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel de detalle"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-2 text-xs text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label
                htmlFor="drawer-status"
                className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1"
              >
                Estado
              </label>
              <select
                id="drawer-status"
                value={issue.status}
                disabled={saving}
                onChange={(e) =>
                  void patchIssue({ status: e.target.value as IssueStatus })
                }
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
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
                htmlFor="drawer-priority"
                className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1"
              >
                Prioridad
              </label>
              <select
                id="drawer-priority"
                value={issue.priority}
                disabled={saving}
                onChange={(e) =>
                  void patchIssue({ priority: e.target.value as IssuePriority })
                }
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
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
                htmlFor="drawer-type"
                className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1"
              >
                Tipo
              </label>
              <select
                id="drawer-type"
                value={issue.type}
                disabled={saving}
                onChange={(e) =>
                  void patchIssue({ type: e.target.value as IssueType })
                }
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
              >
                {ISSUE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {TYPE_META[item].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FocusTimerWidget
            issueId={issue.id}
            timeSpentSeconds={issue.timeSpentSeconds}
            onRecordSession={(payload) =>
              onRecordFocusSession(issue.id, payload)
            }
          />

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Detalle del Issue
              </span>
              <button
                type="button"
                onClick={() => setEditingText((prev) => !prev)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {editingText ? "Cancelar edición" : "Editar título / Markdown"}
              </button>
            </div>

            {editingText ? (
              <div className="space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <input
                  type="text"
                  aria-label="Editar título"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100"
                />
                <textarea
                  rows={5}
                  aria-label="Editar descripción Markdown"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  disabled={saving || !title.trim()}
                  onClick={() =>
                    void patchIssue({
                      title: title.trim(),
                      description,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Guardar cambios</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                  {issue.title}
                </h3>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3.5">
                  <MarkdownPreview content={issue.description} />
                </div>
              </div>
            )}
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Etiquetas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allLabels.map((label) => {
                const active = issue.labels.some(
                  (item) => item.id === label.id,
                );
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

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <Clock className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              <span>Historial de sesiones Focus ({sessions.length})</span>
            </h4>
            {sessions.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Aún no hay sesiones registradas en este issue.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs"
                  >
                    <span className="font-medium capitalize text-zinc-700 dark:text-zinc-300">
                      {session.mode}
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      +{formatDuration(session.durationSeconds)}
                    </span>
                    <span className="text-zinc-400">
                      {session.createdAt.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
