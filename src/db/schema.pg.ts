import type {
  FocusMode,
  IssuePriority,
  IssueStatus,
  IssueType,
} from "@/lib/constants";
import {
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
} from "drizzle-orm/pg-core";

export const projectsPg = pgTable("projects", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  issueCounter: integer("issue_counter").notNull().default(100),
});

export const issuesPg = pgTable("issues", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsPg.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").$type<IssueStatus>().notNull().default("Todo"),
  priority: text("priority").$type<IssuePriority>().notNull().default("Medium"),
  type: text("type").$type<IssueType>().notNull().default("feature"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

export const labelsPg = pgTable("labels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const issueLabelsPg = pgTable(
  "issue_labels",
  {
    issueId: integer("issue_id")
      .notNull()
      .references(() => issuesPg.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => labelsPg.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.issueId, table.labelId] })],
);

export const focusSessionsPg = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id")
    .notNull()
    .references(() => issuesPg.id, { onDelete: "cascade" }),
  durationSeconds: integer("duration_seconds").notNull(),
  mode: text("mode").$type<FocusMode>().notNull().default("pomodoro"),
  createdAt: text("created_at").notNull(),
});
