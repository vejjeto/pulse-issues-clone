import type { IssuePriority, IssueStatus, IssueType } from "@/lib/constants";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bug,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  Eye,
  Minus,
  Sparkles,
  Zap,
} from "lucide-react";

export function StatusIcon({ status }: { status: IssueStatus }) {
  switch (status) {
    case "Backlog":
      return (
        <CircleDashed
          className="h-3.5 w-3.5 text-zinc-400"
          aria-hidden="true"
        />
      );
    case "Todo":
      return (
        <Circle className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      );
    case "In Progress":
      return (
        <CircleDot className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
      );
    case "In Review":
      return <Eye className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" />;
    case "Done":
      return (
        <CheckCircle2
          className="h-3.5 w-3.5 text-emerald-500"
          aria-hidden="true"
        />
      );
  }
}

export function PriorityIcon({ priority }: { priority: IssuePriority }) {
  switch (priority) {
    case "Urgent":
      return (
        <AlertCircle className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
      );
    case "High":
      return (
        <ArrowUp className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
      );
    case "Medium":
      return <Minus className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />;
    case "Low":
      return (
        <ArrowDown className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
      );
  }
}

export function TypeIcon({ type }: { type: IssueType }) {
  switch (type) {
    case "feature":
      return (
        <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
      );
    case "bug":
      return <Bug className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />;
    case "improvement":
      return <Zap className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" />;
  }
}
