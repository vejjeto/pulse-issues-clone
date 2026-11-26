import { type AppDb, getDb } from "@/db";
import {
  type FocusSessionRow,
  type IssueRow,
  type IssueWithLabels,
  type LabelRow,
  type ProjectRow,
  focusSessions,
  issueLabels,
  issues,
  labels,
  projects,
} from "@/db/schema";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { type IssueFilterState, filterIssues } from "./filters";
import type {
  CreateIssueInput,
  FocusSessionInput,
  UpdateIssueInput,
} from "./validation";

async function attachLabelsToIssues(
  db: AppDb,
  issueRows: IssueRow[],
): Promise<IssueWithLabels[]> {
  if (issueRows.length === 0) return [];

  const issueIds = issueRows.map((row) => row.id);
  const joined = await db
    .select({
      issueId: issueLabels.issueId,
      label: labels,
    })
    .from(issueLabels)
    .innerJoin(labels, eq(issueLabels.labelId, labels.id))
    .where(inArray(issueLabels.issueId, issueIds))
    .orderBy(asc(labels.name));

  const labelMap = new Map<number, LabelRow[]>();
  for (const row of joined) {
    const list = labelMap.get(row.issueId) ?? [];
    list.push(row.label);
    labelMap.set(row.issueId, list);
  }

  return issueRows.map((issue) => ({
    ...issue,
    labels: labelMap.get(issue.id) ?? [],
  }));
}

export async function listWorkspaceData(
  filters: IssueFilterState = {},
  db: AppDb = getDb(),
): Promise<{
  issues: IssueWithLabels[];
  labels: LabelRow[];
  project: ProjectRow | null;
}> {
  const [project] = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.id))
    .limit(1);

  const allLabels = await db.select().from(labels).orderBy(asc(labels.name));
  const rawIssues = await db.select().from(issues).orderBy(desc(issues.id));

  const enriched = await attachLabelsToIssues(db, rawIssues);
  return {
    issues: filterIssues(enriched, filters),
    labels: allLabels,
    project: project ?? null,
  };
}

export async function getIssueById(
  id: number,
  db: AppDb = getDb(),
): Promise<IssueWithLabels | null> {
  const [issue] = await db
    .select()
    .from(issues)
    .where(eq(issues.id, id))
    .limit(1);

  if (!issue) return null;
  const [enriched] = await attachLabelsToIssues(db, [issue]);
  return enriched ?? null;
}

export async function listFocusSessionsForIssue(
  issueId: number,
  db: AppDb = getDb(),
): Promise<FocusSessionRow[]> {
  return db
    .select()
    .from(focusSessions)
    .where(eq(focusSessions.issueId, issueId))
    .orderBy(desc(focusSessions.id));
}

async function syncIssueLabels(
  db: AppDb,
  issueId: number,
  labelIds: number[],
): Promise<void> {
  await db.delete(issueLabels).where(eq(issueLabels.issueId, issueId));
  if (labelIds.length === 0) return;

  const uniqueIds = Array.from(new Set(labelIds));
  const existingLabels = await db
    .select({ id: labels.id })
    .from(labels)
    .where(inArray(labels.id, uniqueIds));

  if (existingLabels.length === 0) return;

  await db.insert(issueLabels).values(
    existingLabels.map((lbl) => ({
      issueId,
      labelId: lbl.id,
    })),
  );
}

export async function createIssue(
  input: CreateIssueInput,
  db: AppDb = getDb(),
): Promise<IssueWithLabels> {
  const [updatedProject] = await db
    .update(projects)
    .set({ issueCounter: sql`${projects.issueCounter} + 1` })
    .where(eq(projects.key, input.projectKey))
    .returning();

  if (!updatedProject) {
    throw new Error(`Project '${input.projectKey}' not found`);
  }

  const now = new Date().toISOString();
  const identifier = `${updatedProject.key}-${updatedProject.issueCounter}`;
  const completedAt = input.status === "Done" ? now : null;

  const [created] = await db
    .insert(issues)
    .values({
      identifier,
      projectId: updatedProject.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      type: input.type,
      timeSpentSeconds: 0,
      completedAt,
      createdAt: now,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to insert issue");
  }

  if (input.labelIds.length > 0) {
    await syncIssueLabels(db, created.id, input.labelIds);
  }

  const hydrated = await getIssueById(created.id, db);
  if (!hydrated) {
    throw new Error("Failed to load created issue");
  }
  return hydrated;
}

export async function updateIssue(
  id: number,
  input: UpdateIssueInput,
  db: AppDb = getDb(),
): Promise<IssueWithLabels | null> {
  const [existing] = await db
    .select()
    .from(issues)
    .where(eq(issues.id, id))
    .limit(1);

  if (!existing) return null;

  let nextCompletedAt = existing.completedAt;
  if (input.status !== undefined) {
    if (input.status === "Done" && existing.status !== "Done") {
      nextCompletedAt = new Date().toISOString();
    } else if (input.status !== "Done") {
      nextCompletedAt = null;
    }
  }

  await db
    .update(issues)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.status !== undefined ? { completedAt: nextCompletedAt } : {}),
    })
    .where(eq(issues.id, id));

  if (input.labelIds !== undefined) {
    await syncIssueLabels(db, id, input.labelIds);
  }

  return getIssueById(id, db);
}

export async function deleteIssue(
  id: number,
  db: AppDb = getDb(),
): Promise<boolean> {
  const deleted = await db
    .delete(issues)
    .where(eq(issues.id, id))
    .returning({ id: issues.id });
  return deleted.length > 0;
}

export async function recordFocusSession(
  issueId: number,
  input: FocusSessionInput,
  db: AppDb = getDb(),
): Promise<{ issue: IssueWithLabels; session: FocusSessionRow } | null> {
  const [existing] = await db
    .select()
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);

  if (!existing) return null;

  const now = new Date().toISOString();
  const [session] = await db
    .insert(focusSessions)
    .values({
      issueId,
      durationSeconds: input.durationSeconds,
      mode: input.mode,
      createdAt: now,
    })
    .returning();

  if (!session) {
    throw new Error("Failed to insert focus session");
  }

  await db
    .update(issues)
    .set({
      timeSpentSeconds: sql`${issues.timeSpentSeconds} + ${input.durationSeconds}`,
    })
    .where(eq(issues.id, issueId));

  const updatedIssue = await getIssueById(issueId, db);
  if (!updatedIssue) return null;

  return { issue: updatedIssue, session };
}
