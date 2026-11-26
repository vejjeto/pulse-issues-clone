import type {
  FocusMode,
  IssuePriority,
  IssueStatus,
  IssueType,
} from "@/lib/constants";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  issueCounter: integer("issue_counter").notNull().default(100),
});

export const issues = sqliteTable("issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  identifier: text("identifier").notNull().unique(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").$type<IssueStatus>().notNull().default("Todo"),
  priority: text("priority").$type<IssuePriority>().notNull().default("Medium"),
  type: text("type").$type<IssueType>().notNull().default("feature"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

export const labels = sqliteTable("labels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const issueLabels = sqliteTable(
  "issue_labels",
  {
    issueId: integer("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.issueId, table.labelId] })],
);

export const focusSessions = sqliteTable("focus_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  issueId: integer("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  durationSeconds: integer("duration_seconds").notNull(),
  mode: text("mode").$type<FocusMode>().notNull().default("pomodoro"),
  createdAt: text("created_at").notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type IssueRow = typeof issues.$inferSelect;
export type LabelRow = typeof labels.$inferSelect;
export type FocusSessionRow = typeof focusSessions.$inferSelect;

export interface IssueWithLabels extends IssueRow {
  labels: LabelRow[];
}
