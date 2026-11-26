import type { IssueWithLabels } from "@/db/schema";
import type { IssueType } from "./constants";

export interface ReleaseNotesOptions {
  version: string;
  from?: string | undefined;
  to?: string | undefined;
}

export interface ReleaseNotesResult {
  markdown: string;
  issues: IssueWithLabels[];
  totalTimeSeconds: number;
  count: number;
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  if (safeSeconds === 0) return "0m";
  if (safeSeconds < 60) return `${safeSeconds}s`;

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function parseBoundaryMs(
  value: string | undefined,
  endOfDay: boolean,
): number | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const isoCandidate = DATE_ONLY_REGEX.test(trimmed)
    ? `${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : trimmed;
  const parsed = Date.parse(isoCandidate);
  return Number.isNaN(parsed) ? null : parsed;
}

export function filterDoneIssuesByDateRange(
  items: IssueWithLabels[],
  from?: string,
  to?: string,
): IssueWithLabels[] {
  const fromMs = parseBoundaryMs(from, false);
  const toMs = parseBoundaryMs(to, true);

  return items
    .filter((issue) => {
      if (issue.status !== "Done" || !issue.completedAt) return false;
      const completedMs = Date.parse(issue.completedAt);
      if (Number.isNaN(completedMs)) return false;
      if (fromMs !== null && completedMs < fromMs) return false;
      if (toMs !== null && completedMs > toMs) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.completedAt ?? "") || 0;
      const bTime = Date.parse(b.completedAt ?? "") || 0;
      return bTime - aTime;
    });
}

const SECTION_CONFIG: Array<{ type: IssueType; heading: string }> = [
  { type: "feature", heading: "## ✨ Features" },
  { type: "bug", heading: "## 🐛 Bug Fixes" },
  { type: "improvement", heading: "## ⚡ Improvements" },
];

function formatIssueBullet(issue: IssueWithLabels): string {
  const focusSuffix =
    issue.timeSpentSeconds > 0
      ? ` _(${formatDuration(issue.timeSpentSeconds)} Focus)_`
      : "";
  return `- **${issue.identifier}** — ${issue.title}${focusSuffix}`;
}

export function generateReleaseNotesMarkdown(
  items: IssueWithLabels[],
  options: ReleaseNotesOptions,
): ReleaseNotesResult {
  const matched = filterDoneIssuesByDateRange(items, options.from, options.to);
  const totalTimeSeconds = matched.reduce(
    (sum, issue) => sum + issue.timeSpentSeconds,
    0,
  );
  const versionLabel = options.version.trim() || "v1.4.0";
  const rangeParts = [options.from?.trim(), options.to?.trim()].filter(Boolean);
  const rangeSubtitle =
    rangeParts.length === 2
      ? `${rangeParts[0]} → ${rangeParts[1]}`
      : rangeParts.length === 1
        ? `Desde ${rangeParts[0]}`
        : "Todos los completados";

  const lines: string[] = [
    `# Release ${versionLabel}`,
    "",
    `> Rango: **${rangeSubtitle}** · Issues completados: **${matched.length}** · Tiempo Focus total: **${formatDuration(totalTimeSeconds)}**`,
    "",
  ];

  if (matched.length === 0) {
    lines.push("_No hay issues en estado Done dentro del rango seleccionado._");
    return {
      markdown: lines.join("\n"),
      issues: matched,
      totalTimeSeconds,
      count: 0,
    };
  }

  for (const section of SECTION_CONFIG) {
    const group = matched.filter((issue) => issue.type === section.type);
    if (group.length === 0) continue;
    lines.push(section.heading);
    for (const issue of group) {
      lines.push(formatIssueBullet(issue));
    }
    lines.push("");
  }

  return {
    markdown: lines.join("\n").trimEnd(),
    issues: matched,
    totalTimeSeconds,
    count: matched.length,
  };
}
