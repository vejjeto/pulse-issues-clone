import { GET as docsGet } from "@/app/api/docs/route";
import { GET as healthGet } from "@/app/api/health/route";
import {
  GET as getIssueRoute,
  PATCH as patchIssue,
} from "@/app/api/issues/[id]/route";
import { POST as postIssue } from "@/app/api/issues/route";
import { GET as openApiGet } from "@/app/api/openapi.json/route";
import { type DatabaseBundle, createDatabase, resetCachedDatabase } from "@/db";
import type { IssueWithLabels } from "@/db/schema";
import { seedDatabaseIfEmpty } from "@/db/seed-data";
import {
  filterDoneIssuesByDateRange,
  formatDuration,
  generateReleaseNotesMarkdown,
} from "@/lib/changelog";
import { parseEnv } from "@/lib/env";
import {
  filterIssues,
  parseFiltersFromSearchParams,
  serializeFiltersToQueryString,
} from "@/lib/filters";
import {
  createIssue,
  deleteIssue,
  getIssueById,
  listFocusSessionsForIssue,
  listWorkspaceData,
  recordFocusSession,
  updateIssue,
} from "@/lib/issues-service";
import {
  createIssueSchema,
  focusSessionSchema,
  updateIssueSchema,
} from "@/lib/validation";
import { afterEach, describe, expect, it, vi } from "vitest";

const openBundles: DatabaseBundle[] = [];

function createMemoryBundle(): DatabaseBundle {
  const bundle = createDatabase(":memory:", { autoSeed: true });
  openBundles.push(bundle);
  return bundle;
}

afterEach(() => {
  while (openBundles.length > 0) {
    const bundle = openBundles.pop();
    bundle?.sqlite.close();
  }
});

describe("URL filter serializer & parser", () => {
  it("realiza round-trip exacto e ignora valores de enum inválidos", () => {
    const query = serializeFiltersToQueryString({
      status: "In Progress",
      priority: "Urgent",
      type: "bug",
      label: "Security",
      q: "XSS drawer",
    });

    expect(query).toBe(
      "status=In+Progress&priority=Urgent&type=bug&label=Security&q=XSS+drawer",
    );

    const parsed = parseFiltersFromSearchParams(new URLSearchParams(query));
    expect(parsed).toEqual({
      status: "In Progress",
      priority: "Urgent",
      type: "bug",
      label: "Security",
      q: "XSS drawer",
    });

    const sanitized = parseFiltersFromSearchParams({
      status: "InvalidStatus",
      priority: "High",
      type: "unknown",
      q: "  latency  ",
    });
    expect(sanitized).toEqual({ priority: "High", q: "latency" });
  });
});

describe("Filtrado multicriterio de issues", () => {
  const sampleIssues: IssueWithLabels[] = [
    {
      id: 1,
      identifier: "ENG-101",
      projectId: 1,
      title: "Corregir fuga de memoria en timer",
      description: "Limpiar setInterval al desmontar drawer",
      status: "In Progress",
      priority: "High",
      type: "bug",
      timeSpentSeconds: 900,
      completedAt: null,
      createdAt: "2026-11-10T10:00:00.000Z",
      labels: [
        { id: 1, name: "Frontend", color: "#6366f1" },
        { id: 4, name: "Performance", color: "#f59e0b" },
      ],
    },
    {
      id: 2,
      identifier: "ENG-102",
      projectId: 1,
      title: "Generador Markdown de Release Notes",
      description: "Agrupar por feature, bug e improvement",
      status: "Done",
      priority: "High",
      type: "feature",
      timeSpentSeconds: 1800,
      completedAt: "2026-11-12T10:00:00.000Z",
      createdAt: "2026-11-01T10:00:00.000Z",
      labels: [{ id: 5, name: "DX", color: "#10b981" }],
    },
  ];

  it("combina status, priority, type, label y búsqueda textual q", () => {
    const matched = filterIssues(sampleIssues, {
      status: "In Progress",
      priority: "High",
      type: "bug",
      label: "performance",
      q: "setInterval",
    });

    expect(matched.map((item) => item.identifier)).toEqual(["ENG-101"]);

    const empty = filterIssues(sampleIssues, {
      status: "Done",
      label: "Frontend",
    });
    expect(empty).toHaveLength(0);
  });
});

describe("Generador Markdown de Release Notes & rango de fechas", () => {
  const fixtureIssues: IssueWithLabels[] = [
    {
      id: 10,
      identifier: "ENG-201",
      projectId: 1,
      title: "Focus Mode Pomodoro",
      description: "",
      status: "Done",
      priority: "High",
      type: "feature",
      timeSpentSeconds: 3000,
      completedAt: "2026-11-10T12:00:00.000Z",
      createdAt: "2026-11-01T09:00:00.000Z",
      labels: [],
    },
    {
      id: 11,
      identifier: "ENG-202",
      projectId: 1,
      title: "Fix sanitización XSS",
      description: "",
      status: "Done",
      priority: "Urgent",
      type: "bug",
      timeSpentSeconds: 1500,
      completedAt: "2026-11-15T18:30:00.000Z",
      createdAt: "2026-11-02T09:00:00.000Z",
      labels: [],
    },
    {
      id: 12,
      identifier: "ENG-203",
      projectId: 1,
      title: "Índice SQLite en completed_at",
      description: "",
      status: "Done",
      priority: "Medium",
      type: "improvement",
      timeSpentSeconds: 900,
      completedAt: "2026-11-01T08:00:00.000Z",
      createdAt: "2026-10-28T09:00:00.000Z",
      labels: [],
    },
    {
      id: 13,
      identifier: "ENG-204",
      projectId: 1,
      title: "Issue aún en progreso",
      description: "",
      status: "In Progress",
      priority: "Medium",
      type: "feature",
      timeSpentSeconds: 2000,
      completedAt: null,
      createdAt: "2026-11-03T09:00:00.000Z",
      labels: [],
    },
  ];

  it("filtra por rango inclusivo de fechas Done y agrupa por categoría con suma Focus", () => {
    const ranged = filterDoneIssuesByDateRange(
      fixtureIssues,
      "2026-11-10",
      "2026-11-15",
    );
    expect(ranged.map((item) => item.identifier)).toEqual([
      "ENG-202",
      "ENG-201",
    ]);

    const result = generateReleaseNotesMarkdown(fixtureIssues, {
      version: "v1.4.0",
      from: "2026-11-10",
      to: "2026-11-15",
    });

    expect(result.count).toBe(2);
    expect(result.totalTimeSeconds).toBe(4500);
    expect(formatDuration(result.totalTimeSeconds)).toBe("1h 15m");
    expect(result.markdown).toContain("# Release v1.4.0");
    expect(result.markdown).toContain("## ✨ Features");
    expect(result.markdown).toContain(
      "- **ENG-201** — Focus Mode Pomodoro _(50m Focus)_",
    );
    expect(result.markdown).toContain("## 🐛 Bug Fixes");
    expect(result.markdown).toContain(
      "- **ENG-202** — Fix sanitización XSS _(25m Focus)_",
    );
    expect(result.markdown).not.toContain("## ⚡ Improvements");
    expect(result.markdown).not.toContain("ENG-203");
    expect(result.markdown).not.toContain("ENG-204");
  });
});

describe("Integración SQLite (:memory:) y reglas de negocio", () => {
  it("siembra de forma idempotente 16 issues ENG-101..116 con 6 etiquetas y 5 Done", async () => {
    const { db, sqlite } = createMemoryBundle();
    const secondRun = seedDatabaseIfEmpty(sqlite);
    expect(secondRun.seeded).toBe(false);
    expect(secondRun.issueCount).toBe(16);

    const workspace = await listWorkspaceData({}, db);
    expect(workspace.project?.key).toBe("ENG");
    expect(workspace.project?.issueCounter).toBe(116);
    expect(workspace.labels).toHaveLength(6);
    expect(workspace.issues).toHaveLength(16);

    const doneIssues = workspace.issues.filter((i) => i.status === "Done");
    expect(doneIssues).toHaveLength(5);
    expect(
      doneIssues.every((i) => i.completedAt !== null && i.timeSpentSeconds > 0),
    ).toBe(true);
  });

  it("incrementa atómicamente el contador ENG-xxx al crear issues secuenciales", async () => {
    const { db } = createMemoryBundle();

    const first = await createIssue(
      {
        title: "Primer issue nuevo",
        description: "Detalle",
        status: "Todo",
        priority: "High",
        type: "feature",
        labelIds: [1, 2],
        projectKey: "ENG",
      },
      db,
    );
    const second = await createIssue(
      {
        title: "Segundo issue nuevo",
        description: "",
        status: "Done",
        priority: "Low",
        type: "improvement",
        labelIds: [],
        projectKey: "ENG",
      },
      db,
    );

    expect(first.identifier).toBe("ENG-117");
    expect(first.labels.map((l) => l.id).sort()).toEqual([1, 2]);
    expect(first.completedAt).toBeNull();

    expect(second.identifier).toBe("ENG-118");
    expect(second.completedAt).not.toBeNull();

    const deleted = await deleteIssue(second.id, db);
    expect(deleted).toBe(true);
    expect(await getIssueById(second.id, db)).toBeNull();
  });

  it("gestiona completedAt automáticamente al mover hacia y desde Done", async () => {
    const { db } = createMemoryBundle();
    const created = await createIssue(
      {
        title: "Transición Done",
        description: "",
        status: "In Review",
        priority: "Medium",
        type: "bug",
        labelIds: [],
        projectKey: "ENG",
      },
      db,
    );
    expect(created.completedAt).toBeNull();

    const movedToDone = await updateIssue(created.id, { status: "Done" }, db);
    expect(movedToDone?.status).toBe("Done");
    expect(movedToDone?.completedAt).not.toBeNull();

    const reopened = await updateIssue(
      created.id,
      { status: "In Progress" },
      db,
    );
    expect(reopened?.status).toBe("In Progress");
    expect(reopened?.completedAt).toBeNull();
  });

  it("acumula tiempo de sesiones Focus en focus_sessions y en issues.timeSpentSeconds", async () => {
    const { db } = createMemoryBundle();
    const created = await createIssue(
      {
        title: "Medición Pomodoro",
        description: "",
        status: "In Progress",
        priority: "Urgent",
        type: "feature",
        labelIds: [],
        projectKey: "ENG",
      },
      db,
    );
    expect(created.timeSpentSeconds).toBe(0);

    const firstSession = await recordFocusSession(
      created.id,
      { durationSeconds: 1500, mode: "pomodoro" },
      db,
    );
    const secondSession = await recordFocusSession(
      created.id,
      { durationSeconds: 345, mode: "stopwatch" },
      db,
    );

    expect(firstSession?.issue.timeSpentSeconds).toBe(1500);
    expect(secondSession?.issue.timeSpentSeconds).toBe(1845);

    const history = await listFocusSessionsForIssue(created.id, db);
    expect(history).toHaveLength(2);
    expect(history.map((s) => s.durationSeconds).sort((a, b) => a - b)).toEqual(
      [345, 1500],
    );
  });
});

describe("Validación estricta con Zod", () => {
  it("rechaza payloads inválidos en creación, actualización y sesiones Focus", () => {
    expect(createIssueSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(
      createIssueSchema.safeParse({ title: "OK", status: "Archived" }).success,
    ).toBe(false);
    expect(updateIssueSchema.safeParse({}).success).toBe(false);

    expect(
      focusSessionSchema.safeParse({ durationSeconds: 0, mode: "pomodoro" })
        .success,
    ).toBe(false);
    expect(
      focusSessionSchema.safeParse({ durationSeconds: -120, mode: "stopwatch" })
        .success,
    ).toBe(false);
    expect(
      focusSessionSchema.safeParse({ durationSeconds: 90000, mode: "pomodoro" })
        .success,
    ).toBe(false);
    expect(
      focusSessionSchema.safeParse({ durationSeconds: 1500, mode: "pomodoro" })
        .success,
    ).toBe(true);
  });
});

describe("Contratos standalone: env.ts, /api/health, RFC 7807 y OpenAPI", () => {
  const originalDbUrl = process.env.DATABASE_URL;

  afterEach(() => {
    vi.restoreAllMocks();
    resetCachedDatabase();
    if (originalDbUrl === undefined) {
      Reflect.deleteProperty(process.env, "DATABASE_URL");
    } else process.env.DATABASE_URL = originalDbUrl;
  });

  it("valida variables de entorno con Zod y soporta SKIP_ENV_VALIDATION=true", () => {
    const defaults = parseEnv({});
    expect(defaults.DATABASE_URL).toBe("data/app.db");
    expect(defaults.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3003");

    expect(() => parseEnv({ NEXT_PUBLIC_APP_URL: "not-a-valid-url" })).toThrow(
      /Invalid environment variables/,
    );

    const skipped = parseEnv({
      SKIP_ENV_VALIDATION: "true",
      NEXT_PUBLIC_APP_URL: "not-a-valid-url",
      DATABASE_URL: "custom.db",
    });
    expect(skipped.DATABASE_URL).toBe("custom.db");
    expect(skipped.NEXT_PUBLIC_APP_URL).toBe("not-a-valid-url");
  });

  it("expone /api/health estandarizado con latencia SQLite y x-request-id", async () => {
    process.env.DATABASE_URL = ":memory:";
    resetCachedDatabase();

    const response = await healthGet(
      new Request("http://localhost:3003/api/health", {
        headers: { "x-request-id": "req-health-1" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req-health-1");

    const payload = (await response.json()) as {
      status: string;
      service: string;
      dbLatencyMs: number;
      uptimeSeconds: number;
      version: string;
      timestamp: string;
    };
    expect(payload.status).toBe("ok");
    expect(payload.service).toBe("pulse-issues-clone");
    expect(payload.dbLatencyMs).toBeGreaterThanOrEqual(0);
    expect(payload.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(payload.version).toBe("2.0.0");
    expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
  });

  it("retorna RFC 7807 Problem Details + x-request-id ante errores de API", async () => {
    process.env.DATABASE_URL = ":memory:";
    resetCachedDatabase();

    const invalidIdRes = await getIssueRoute(
      new Request("http://localhost:3003/api/issues/abc"),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(invalidIdRes.status).toBe(400);
    expect(invalidIdRes.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(invalidIdRes.headers.get("x-request-id")).toBeTruthy();
    const invalidIdBody = (await invalidIdRes.json()) as {
      title: string;
      status: number;
      instance: string;
    };
    expect(invalidIdBody.title).toBe("Invalid Issue ID");
    expect(invalidIdBody.status).toBe(400);
    expect(invalidIdBody.instance).toBe("/api/issues/abc");

    const notFoundRes = await getIssueRoute(
      new Request("http://localhost:3003/api/issues/999999", {
        headers: { "x-request-id": "req-404" },
      }),
      { params: Promise.resolve({ id: "999999" }) },
    );
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.headers.get("x-request-id")).toBe("req-404");
    expect(notFoundRes.headers.get("content-type")).toContain(
      "application/problem+json",
    );

    const badPostRes = await postIssue(
      new Request("http://localhost:3003/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      }),
    );
    expect(badPostRes.status).toBe(400);
    expect(badPostRes.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    const badPostBody = (await badPostRes.json()) as {
      title: string;
      errors?: Record<string, string[]>;
    };
    expect(badPostBody.title).toBe("Validation Error");
    expect(badPostBody.errors?.title).toBeDefined();
  });

  it("sirve /api/openapi.json y /api/docs con rutas de PulseIssues y x-request-id", async () => {
    const specResponse = await openApiGet(
      new Request("http://localhost:3003/api/openapi.json", {
        headers: { "x-request-id": "req-openapi" },
      }),
    );
    expect(specResponse.status).toBe(200);
    expect(specResponse.headers.get("x-request-id")).toBe("req-openapi");
    const spec = (await specResponse.json()) as {
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, Record<string, unknown>>;
    };
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("PulseIssues API");
    expect(spec.paths["/api/health"]?.get).toBeDefined();
    expect(spec.paths["/api/issues"]?.post).toBeDefined();
    expect(spec.paths["/api/issues/{id}"]?.patch).toBeDefined();
    expect(spec.paths["/api/issues/{id}/focus"]?.post).toBeDefined();
    expect(spec.paths["/api/changelog"]?.get).toBeDefined();

    const docsResponse = await docsGet(
      new Request("http://localhost:3003/api/docs"),
    );
    expect(docsResponse.status).toBe(200);
    expect(docsResponse.headers.get("x-request-id")).toBeTruthy();
    const html = await docsResponse.text();
    expect(html).toContain("PulseIssues API");
    expect(html).toContain("/api/openapi.json");
  });

  it("actualiza a Done y persiste completedAt vía PATCH /api/issues/[id]", async () => {
    process.env.DATABASE_URL = ":memory:";
    resetCachedDatabase();

    const workspace = await listWorkspaceData({});
    const target = workspace.issues.find((item) => item.status !== "Done");
    expect(target).toBeDefined();

    const req = new Request(`http://localhost:3003/api/issues/${target!.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": "req-patch-done",
      },
      body: JSON.stringify({ status: "Done" }),
    });

    const patchRes = await patchIssue(req, {
      params: Promise.resolve({ id: String(target!.id) }),
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.headers.get("x-request-id")).toBe("req-patch-done");
    const body = (await patchRes.json()) as { issue: IssueWithLabels };
    expect(body.issue.status).toBe("Done");
    expect(body.issue.completedAt).toBeTruthy();
  });
});
