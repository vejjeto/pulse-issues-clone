"use client";

import { HealthBadge } from "@/components/HealthBadge";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  PriorityIcon,
  StatusIcon,
  TypeIcon,
} from "@/components/StatusAndPriorityIcons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/components/ToastProvider";
import type {
  FocusSessionRow,
  IssueWithLabels,
  LabelRow,
  ProjectRow,
} from "@/db/schema";
import { formatDuration } from "@/lib/changelog";
import {
  type FocusMode,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
  PRIORITY_META,
  STATUS_META,
  TYPE_META,
} from "@/lib/constants";
import {
  type IssueFilterState,
  filterIssues,
  hasActiveFilters,
  parseFiltersFromSearchParams,
  serializeFiltersToQueryString,
} from "@/lib/filters";
import { useLocale } from "@/lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  FileText,
  FilterX,
  Layers,
  List,
  Menu,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChangelogModal } from "./ChangelogModal";
import { CreateIssueModal, type CreateIssuePayload } from "./CreateIssueModal";
import { IssueDetailDrawer } from "./IssueDetailDrawer";

interface WorkspaceClientProps {
  initialIssues: IssueWithLabels[];
  initialLabels: LabelRow[];
  initialProject: ProjectRow | null;
}

interface WorkspacePayload {
  issues: IssueWithLabels[];
  labels: LabelRow[];
  project: ProjectRow | null;
}

interface IssueDetailPayload {
  issue: IssueWithLabels;
  sessions: FocusSessionRow[];
}

const WORKSPACE_QUERY_KEY = ["workspace-issues"] as const;

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as {
      detail?: string;
      error?: string;
    };
    return payload.detail ?? payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function WorkspaceClient({
  initialIssues,
  initialLabels,
  initialProject,
}: WorkspaceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { t } = useLocale();

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const workspaceQuery = useQuery<WorkspacePayload>({
    queryKey: WORKSPACE_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/issues", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          "No se pudieron sincronizar los issues con el servidor.",
        );
      }
      return (await response.json()) as WorkspacePayload;
    },
    initialData: {
      issues: initialIssues,
      labels: initialLabels,
      project: initialProject,
    },
  });

  const issues = workspaceQuery.data.issues;
  const labels = workspaceQuery.data.labels;
  const project = workspaceQuery.data.project;

  const [searchDraft, setSearchDraft] = useState(filters.q ?? "");
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeIssueId, setActiveIssueId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const createIssueMutation = useMutation({
    mutationFn: async (input: CreateIssuePayload): Promise<IssueWithLabels> => {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "No se pudo crear el issue."),
        );
      }
      const payload = (await response.json()) as { issue: IssueWithLabels };
      return payload.issue;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: WORKSPACE_QUERY_KEY });
      const previous =
        queryClient.getQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY);
      if (previous) {
        const tempId = -Date.now();
        const optimisticIssue: IssueWithLabels = {
          id: tempId,
          identifier: `${previous.project?.key ?? "ENG"}-...`,
          projectId: previous.project?.id ?? 1,
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          type: input.type,
          timeSpentSeconds: 0,
          completedAt:
            input.status === "Done" ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
          labels: previous.labels.filter((lbl) =>
            input.labelIds.includes(lbl.id),
          ),
        };
        queryClient.setQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY, {
          ...previous,
          issues: [optimisticIssue, ...previous.issues],
        });
        return { previous, tempId };
      }
      return { previous: undefined, tempId: undefined };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(WORKSPACE_QUERY_KEY, context.previous);
      }
      pushToast({
        title: "Error al crear issue",
        description: err instanceof Error ? err.message : "Intenta de nuevo.",
        variant: "error",
      });
    },
    onSuccess: (created, _input, context) => {
      queryClient.setQueryData<WorkspacePayload>(
        WORKSPACE_QUERY_KEY,
        (curr) => {
          if (!curr) return curr;
          const withoutTemp =
            context?.tempId !== undefined
              ? curr.issues.filter((item) => item.id !== context.tempId)
              : curr.issues;
          return { ...curr, issues: [created, ...withoutTemp] };
        },
      );
      setActiveIssueId(created.id);
      pushToast({
        title: `${created.identifier} creado`,
        description: created.title,
        variant: "success",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["changelog"] });
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: number;
      patch: Record<string, unknown>;
    }): Promise<IssueWithLabels> => {
      const response = await fetch(`/api/issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "No se pudo actualizar el issue."),
        );
      }
      const payload = (await response.json()) as { issue: IssueWithLabels };
      return payload.issue;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: WORKSPACE_QUERY_KEY });
      const previous =
        queryClient.getQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY);
      if (previous) {
        const labelIds = Array.isArray(patch.labelIds)
          ? (patch.labelIds as number[])
          : null;
        queryClient.setQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY, {
          ...previous,
          issues: previous.issues.map((item) => {
            if (item.id !== id) return item;
            const nextStatus =
              typeof patch.status === "string"
                ? (patch.status as IssueStatus)
                : item.status;
            return {
              ...item,
              ...(typeof patch.title === "string"
                ? { title: patch.title }
                : {}),
              ...(typeof patch.description === "string"
                ? { description: patch.description }
                : {}),
              ...(typeof patch.priority === "string"
                ? { priority: patch.priority as IssuePriority }
                : {}),
              ...(typeof patch.type === "string"
                ? { type: patch.type as IssueType }
                : {}),
              status: nextStatus,
              completedAt:
                nextStatus === "Done"
                  ? (item.completedAt ?? new Date().toISOString())
                  : null,
              labels: labelIds
                ? previous.labels.filter((lbl) => labelIds.includes(lbl.id))
                : item.labels,
            };
          }),
        });
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(WORKSPACE_QUERY_KEY, context.previous);
      }
      pushToast({
        title: "Error al actualizar issue",
        description: err instanceof Error ? err.message : "Intenta de nuevo.",
        variant: "error",
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY, (curr) =>
        curr
          ? {
              ...curr,
              issues: curr.issues.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : curr,
      );
      if (updated.status === "Done") {
        pushToast({
          title: `${updated.identifier} completado`,
          description: "Listo para Release Notes.",
          variant: "success",
        });
      }
    },
    onSettled: (_data, _err, vars) => {
      void queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: ["issue-detail", vars.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["changelog"] });
    },
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number): Promise<number> => {
      const response = await fetch(`/api/issues/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "No se pudo eliminar el issue."),
        );
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: WORKSPACE_QUERY_KEY });
      const previous =
        queryClient.getQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY, {
          ...previous,
          issues: previous.issues.filter((item) => item.id !== id),
        });
      }
      if (activeIssueId === id) {
        setActiveIssueId(null);
      }
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(WORKSPACE_QUERY_KEY, context.previous);
      }
      pushToast({
        title: "Error al eliminar issue",
        description: err instanceof Error ? err.message : "Intenta de nuevo.",
        variant: "error",
      });
    },
    onSuccess: () => {
      pushToast({ title: "Issue eliminado", variant: "success" });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["changelog"] });
    },
  });

  const focusSessionMutation = useMutation({
    mutationFn: async ({
      issueId,
      durationSeconds,
      mode,
    }: {
      issueId: number;
      durationSeconds: number;
      mode: FocusMode;
    }): Promise<{ issue: IssueWithLabels; session: FocusSessionRow }> => {
      const response = await fetch(`/api/issues/${issueId}/focus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds, mode }),
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "No se pudo registrar la sesión Focus.",
          ),
        );
      }
      return (await response.json()) as {
        issue: IssueWithLabels;
        session: FocusSessionRow;
      };
    },
    onMutate: async ({ issueId, durationSeconds }) => {
      await queryClient.cancelQueries({ queryKey: WORKSPACE_QUERY_KEY });
      const previous =
        queryClient.getQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY, {
          ...previous,
          issues: previous.issues.map((item) =>
            item.id === issueId
              ? {
                  ...item,
                  timeSpentSeconds: item.timeSpentSeconds + durationSeconds,
                }
              : item,
          ),
        });
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(WORKSPACE_QUERY_KEY, context.previous);
      }
      pushToast({
        title: "Error al guardar sesión Focus",
        description: err instanceof Error ? err.message : "Intenta de nuevo.",
        variant: "error",
      });
    },
    onSuccess: ({ issue, session }) => {
      queryClient.setQueryData<WorkspacePayload>(WORKSPACE_QUERY_KEY, (curr) =>
        curr
          ? {
              ...curr,
              issues: curr.issues.map((item) =>
                item.id === issue.id ? issue : item,
              ),
            }
          : curr,
      );
      queryClient.setQueryData<IssueDetailPayload>(
        ["issue-detail", issue.id],
        (curr) =>
          curr
            ? { issue, sessions: [session, ...curr.sessions] }
            : { issue, sessions: [session] },
      );
      pushToast({
        title: `Focus +${formatDuration(session.durationSeconds)}`,
        description: `${issue.identifier} actualizado en SQLite.`,
        variant: "success",
      });
    },
    onSettled: (_data, _err, vars) => {
      void queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: ["issue-detail", vars.issueId],
      });
      void queryClient.invalidateQueries({ queryKey: ["changelog"] });
    },
  });

  useEffect(() => {
    setSearchDraft(filters.q ?? "");
  }, [filters.q]);

  const visibleIssues = useMemo(
    () => filterIssues(issues, filters),
    [issues, filters],
  );

  useEffect(() => {
    setSelectedIndex((prev) =>
      visibleIssues.length === 0 ? 0 : Math.min(prev, visibleIssues.length - 1),
    );
  }, [visibleIssues.length]);

  const activeIssue = useMemo(
    () => issues.find((item) => item.id === activeIssueId) ?? null,
    [issues, activeIssueId],
  );

  const totalFocusSeconds = useMemo(
    () => issues.reduce((acc, item) => acc + item.timeSpentSeconds, 0),
    [issues],
  );

  const updateUrlFilters = useCallback(
    (next: IssueFilterState) => {
      const qs = serializeFiltersToQueryString(next);
      router.replace(qs ? `/workspace?${qs}` : "/workspace", {
        scroll: false,
      });
    },
    [router],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
        if (createOpen) setCreateOpen(false);
        else if (changelogOpen) setChangelogOpen(false);
        else if (activeIssueId !== null) setActiveIssueId(null);
        else if (mobileMenuOpen) setMobileMenuOpen(false);
        return;
      }

      if (isEditableElement(event.target) || createOpen || changelogOpen) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "c") {
        event.preventDefault();
        setCreateOpen(true);
      } else if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (key === "j" && visibleIssues.length > 0) {
        event.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, visibleIssues.length - 1),
        );
      } else if (key === "k" && visibleIssues.length > 0) {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter" && visibleIssues[selectedIndex]) {
        event.preventDefault();
        setActiveIssueId(visibleIssues[selectedIndex].id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeIssueId,
    changelogOpen,
    createOpen,
    mobileMenuOpen,
    selectedIndex,
    visibleIssues,
  ]);

  function handleSearchChange(value: string): void {
    setSearchDraft(value);
    updateUrlFilters({ ...filters, q: value.trim() || undefined });
  }

  function clearAllFilters(): void {
    setSearchDraft("");
    updateUrlFilters({});
  }

  const groupedSections = useMemo(() => {
    if (viewMode === "list") {
      return [{ status: null as IssueStatus | null, items: visibleIssues }];
    }
    return ISSUE_STATUSES.map((status) => ({
      status,
      items: visibleIssues.filter((item) => item.status === status),
    })).filter((group) => group.items.length > 0);
  }, [viewMode, visibleIssues]);

  const rowIndexById = useMemo(() => {
    const map = new Map<number, number>();
    visibleIssues.forEach((item, idx) => map.set(item.id, idx));
    return map;
  }, [visibleIssues]);

  const filtersActive = hasActiveFilters(filters);
  const queryError =
    workspaceQuery.isError && workspaceQuery.error instanceof Error
      ? workspaceQuery.error.message
      : null;

  return (
    <div className="flex flex-1 min-h-0 bg-zinc-50 dark:bg-[#0b0c10]">
      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Cerrar menú de navegación"
        />
      )}

      <aside
        aria-label="Navegación del proyecto"
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0f1118] p-4 transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-[11px] font-bold text-white">
              PI
            </span>
            <span>PulseIssues</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú lateral"
            className="rounded p-1 text-zinc-500 lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {project?.key ?? "ENG"}
            </span>
            <span className="text-[11px] text-zinc-500">
              {issues.length} issues
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">
            {project?.name ?? "Pulse Core Platform"}
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>Focus total: {formatDuration(totalFocusSeconds)}</span>
          </p>
        </div>

        <nav className="space-y-1">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Vistas por estado
          </p>
          <button
            type="button"
            onClick={() => {
              updateUrlFilters({ ...filters, status: undefined });
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium ${
              !filters.status
                ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
            }`}
          >
            <span>Todos los issues</span>
            <span className="font-mono text-[11px]">{issues.length}</span>
          </button>
          {ISSUE_STATUSES.map((status) => {
            const count = issues.filter(
              (item) => item.status === status,
            ).length;
            const active = filters.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  updateUrlFilters({
                    ...filters,
                    status: active ? undefined : status,
                  });
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
                }`}
              >
                <span className="flex items-center gap-2">
                  <StatusIcon status={status} />
                  {status}
                </span>
                <span className="font-mono text-[11px]">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">
            Atajos de teclado
          </p>
          <p>
            <kbd className="rounded border px-1 font-mono">C</kbd> Nuevo issue ·{" "}
            <kbd className="rounded border px-1 font-mono">/</kbd> Buscar
          </p>
          <p>
            <kbd className="rounded border px-1 font-mono">J</kbd>/
            <kbd className="rounded border px-1 font-mono">K</kbd> Navegar ·{" "}
            <kbd className="rounded border px-1 font-mono">Enter</kbd> Abrir
          </p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#0d0f14]/90 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menú lateral"
                className="rounded-md border border-zinc-200 dark:border-zinc-800 p-1.5 text-zinc-600 dark:text-zinc-300 lg:hidden"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.workspace.title}
              </h1>
              <span className="hidden sm:inline-block rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                {visibleIssues.length} {t.workspace.visibleCount}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <HealthBadge />
              <LanguageToggle />
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setChangelogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FileText
                  className="h-3.5 w-3.5 text-violet-500"
                  aria-hidden="true"
                />
                <span>{t.workspace.releaseNotes}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.workspace.newIssue}</span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search
                className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Buscar issues por título, identificador o descripción"
                value={searchDraft}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t.workspace.searchPlaceholder}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <select
              aria-label="Filtrar por estado"
              value={filters.status ?? ""}
              onChange={(e) =>
                updateUrlFilters({
                  ...filters,
                  status: (e.target.value || undefined) as
                    | IssueStatus
                    | undefined,
                })
              }
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value="">{t.workspace.allStatuses}</option>
              {ISSUE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por prioridad"
              value={filters.priority ?? ""}
              onChange={(e) =>
                updateUrlFilters({
                  ...filters,
                  priority: (e.target.value || undefined) as
                    | IssuePriority
                    | undefined,
                })
              }
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value="">{t.workspace.allPriorities}</option>
              {ISSUE_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por tipo"
              value={filters.type ?? ""}
              onChange={(e) =>
                updateUrlFilters({
                  ...filters,
                  type: (e.target.value || undefined) as IssueType | undefined,
                })
              }
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value="">{t.workspace.allTypes}</option>
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_META[type].label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por etiqueta"
              value={filters.label ?? ""}
              onChange={(e) =>
                updateUrlFilters({
                  ...filters,
                  label: e.target.value || undefined,
                })
              }
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value="">{t.workspace.allLabels}</option>
              {labels.map((label) => (
                <option key={label.id} value={label.name}>
                  {label.name}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-md border border-zinc-200 dark:border-zinc-700 p-0.5">
              <button
                type="button"
                aria-label="Vista agrupada por estado"
                onClick={() => setViewMode("grouped")}
                className={`rounded p-1 ${
                  viewMode === "grouped"
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Vista en lista plana"
                onClick={() => setViewMode("list")}
                className={`rounded p-1 ${
                  viewMode === "list"
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {filtersActive && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.workspace.clearFilters}</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {queryError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-xs text-red-700 dark:text-red-300"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {queryError}
              </span>
              <button
                type="button"
                onClick={() => void workspaceQuery.refetch()}
                className="inline-flex items-center gap-1 rounded border border-red-300 dark:border-red-800 px-2.5 py-1 font-medium hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>Reintentar</span>
              </button>
            </div>
          )}

          {workspaceQuery.isLoading ? (
            <div aria-busy="true" className="space-y-2">
              {[0, 1, 2, 3, 4].map((skeleton) => (
                <div
                  key={skeleton}
                  className="h-12 animate-pulse rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
                />
              ))}
            </div>
          ) : visibleIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#11131a] px-6 py-12 text-center">
              <FilterX
                className="h-8 w-8 text-zinc-400 mb-3"
                aria-hidden="true"
              />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.workspace.emptyTitle}
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t.workspace.emptySubtitle}
              </p>
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  <span>{t.workspace.clearFilters}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {groupedSections.map((group) => (
                <section
                  key={group.status ?? "all"}
                  className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131a]"
                >
                  {group.status && (
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 px-4 py-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        <StatusIcon status={group.status} />
                        <span>{STATUS_META[group.status].label}</span>
                        <span className="rounded bg-zinc-200/80 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
                          {group.items.length}
                        </span>
                      </div>
                    </div>
                  )}

                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                    {group.items.map((issue) => {
                      const flatIdx = rowIndexById.get(issue.id) ?? 0;
                      const isRowActive = flatIdx === selectedIndex;

                      return (
                        <li key={issue.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIndex(flatIdx);
                              setActiveIssueId(issue.id);
                            }}
                            className={`flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                              isRowActive
                                ? "bg-indigo-50/70 dark:bg-indigo-950/30 ring-1 ring-inset ring-indigo-500/40"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <PriorityIcon priority={issue.priority} />
                              <span className="shrink-0 font-mono text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {issue.identifier}
                              </span>
                              <StatusIcon status={issue.status} />
                              <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {issue.title}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${TYPE_META[issue.type].badgeClass}`}
                              >
                                <TypeIcon type={issue.type} />
                                {TYPE_META[issue.type].label}
                              </span>

                              <span
                                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_META[issue.priority].badgeClass}`}
                              >
                                {issue.priority}
                              </span>

                              {issue.labels.map((label) => (
                                <span
                                  key={label.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300"
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                  />
                                  {label.name}
                                </span>
                              ))}

                              {issue.timeSpentSeconds > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                  <Clock
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  {formatDuration(issue.timeSpentSeconds)}
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <IssueDetailDrawer
        issue={activeIssue}
        allLabels={labels}
        isMutating={
          updateIssueMutation.isPending ||
          deleteIssueMutation.isPending ||
          focusSessionMutation.isPending
        }
        onClose={() => setActiveIssueId(null)}
        onUpdateIssue={(id, patch) =>
          updateIssueMutation.mutateAsync({ id, patch })
        }
        onDeleteIssue={(id) => deleteIssueMutation.mutateAsync(id)}
        onRecordFocusSession={(issueId, payload) =>
          focusSessionMutation.mutateAsync({ issueId, ...payload })
        }
      />

      <CreateIssueModal
        open={createOpen}
        labels={labels}
        submitting={createIssueMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onCreateIssue={(payload) => createIssueMutation.mutateAsync(payload)}
      />

      <ChangelogModal
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
    </div>
  );
}
