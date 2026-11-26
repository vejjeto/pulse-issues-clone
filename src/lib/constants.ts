export const ISSUE_STATUSES = [
  "Backlog",
  "Todo",
  "In Progress",
  "In Review",
  "Done",
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;

export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_TYPES = ["feature", "bug", "improvement"] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export const FOCUS_MODES = ["pomodoro", "stopwatch"] as const;

export type FocusMode = (typeof FOCUS_MODES)[number];

export const STATUS_META: Record<
  IssueStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  Backlog: {
    label: "Backlog",
    badgeClass:
      "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700",
    dotClass: "bg-zinc-400",
  },
  Todo: {
    label: "Todo",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700",
    dotClass: "bg-slate-400",
  },
  "In Progress": {
    label: "In Progress",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70",
    dotClass: "bg-amber-500",
  },
  "In Review": {
    label: "In Review",
    badgeClass:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/70",
    dotClass: "bg-indigo-500",
  },
  Done: {
    label: "Done",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70",
    dotClass: "bg-emerald-500",
  },
};

export const PRIORITY_META: Record<
  IssuePriority,
  { label: string; badgeClass: string; rank: number }
> = {
  Urgent: {
    label: "Urgent",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70",
    rank: 0,
  },
  High: {
    label: "High",
    badgeClass:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/70",
    rank: 1,
  },
  Medium: {
    label: "Medium",
    badgeClass:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70",
    rank: 2,
  },
  Low: {
    label: "Low",
    badgeClass:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700",
    rank: 3,
  },
};

export const TYPE_META: Record<
  IssueType,
  { label: string; badgeClass: string }
> = {
  feature: {
    label: "Feature",
    badgeClass:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/70",
  },
  bug: {
    label: "Bug",
    badgeClass:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/70",
  },
  improvement: {
    label: "Improvement",
    badgeClass:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/70",
  },
};

export const PORTFOLIO_DISCLAIMER =
  "Proyecto educativo y de portafolio inspirado en Linear. No afiliado a la marca original.";
