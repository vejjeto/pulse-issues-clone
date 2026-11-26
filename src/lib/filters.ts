import type { IssueWithLabels } from "@/db/schema";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
} from "./constants";

export interface IssueFilterState {
  status?: IssueStatus | undefined;
  priority?: IssuePriority | undefined;
  type?: IssueType | undefined;
  label?: string | undefined;
  q?: string | undefined;
}

export type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function readParam(params: RawSearchParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    const val = params.get(key);
    return val ?? undefined;
  }
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function matchEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.find((item) => item === value);
}

export function parseFiltersFromSearchParams(
  params: RawSearchParams,
): IssueFilterState {
  const status = matchEnum(readParam(params, "status"), ISSUE_STATUSES);
  const priority = matchEnum(readParam(params, "priority"), ISSUE_PRIORITIES);
  const type = matchEnum(readParam(params, "type"), ISSUE_TYPES);
  const label = readParam(params, "label")?.trim() || undefined;
  const q = readParam(params, "q")?.trim() || undefined;

  return {
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(type ? { type } : {}),
    ...(label ? { label } : {}),
    ...(q ? { q } : {}),
  };
}

export function serializeFiltersToQueryString(
  filters: IssueFilterState,
): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.type) params.set("type", filters.type);
  if (filters.label?.trim()) params.set("label", filters.label.trim());
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  return params.toString();
}

export function hasActiveFilters(filters: IssueFilterState): boolean {
  return Boolean(
    filters.status ||
      filters.priority ||
      filters.type ||
      filters.label?.trim() ||
      filters.q?.trim(),
  );
}

function matchesSearchQuery(issue: IssueWithLabels, query: string): boolean {
  const needle = query.toLowerCase();
  return (
    issue.identifier.toLowerCase().includes(needle) ||
    issue.title.toLowerCase().includes(needle) ||
    issue.description.toLowerCase().includes(needle)
  );
}

export function filterIssues(
  items: IssueWithLabels[],
  filters: IssueFilterState,
): IssueWithLabels[] {
  const normalizedLabel = filters.label?.trim().toLowerCase();
  const normalizedQuery = filters.q?.trim();

  return items.filter((issue) => {
    if (filters.status && issue.status !== filters.status) return false;
    if (filters.priority && issue.priority !== filters.priority) return false;
    if (filters.type && issue.type !== filters.type) return false;
    if (
      normalizedLabel &&
      !issue.labels.some((lbl) => lbl.name.toLowerCase() === normalizedLabel)
    ) {
      return false;
    }
    if (normalizedQuery && !matchesSearchQuery(issue, normalizedQuery)) {
      return false;
    }
    return true;
  });
}
