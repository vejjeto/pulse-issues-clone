import type { DatabaseSync } from "node:sqlite";
import type {
  FocusMode,
  IssuePriority,
  IssueStatus,
  IssueType,
} from "@/lib/constants";

interface SeedLabel {
  name: string;
  color: string;
}

interface SeedIssue {
  identifier: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  labels: string[];
  timeSpentSeconds: number;
  completedDaysAgo?: number;
  createdDaysAgo: number;
  sessions?: Array<{
    durationSeconds: number;
    mode: FocusMode;
    daysAgo: number;
  }>;
}

const SEED_LABELS: SeedLabel[] = [
  { name: "Frontend", color: "#6366f1" },
  { name: "Backend", color: "#0ea5e9" },
  { name: "Security", color: "#ef4444" },
  { name: "Performance", color: "#f59e0b" },
  { name: "DX", color: "#10b981" },
  { name: "AI", color: "#a855f7" },
];

const SEED_ISSUES: SeedIssue[] = [
  {
    identifier: "ENG-101",
    title: "Implementar contadores atómicos por proyecto para IDs ENG-xxx",
    description:
      "Garantizar generación de identificadores secuenciales sin colisiones mediante actualización atómica de `issue_counter` en SQLite.\n\n### Criterios\n- Sin duplicados bajo concurrencia\n- Formato `KEY-###` consistente",
    status: "Done",
    priority: "Urgent",
    type: "feature",
    labels: ["Backend", "Performance"],
    timeSpentSeconds: 3000,
    completedDaysAgo: 9,
    createdDaysAgo: 18,
    sessions: [
      { durationSeconds: 1500, mode: "pomodoro", daysAgo: 10 },
      { durationSeconds: 1500, mode: "pomodoro", daysAgo: 9 },
    ],
  },
  {
    identifier: "ENG-102",
    title:
      "Corregir sincronización bidireccional de filtros en URL Query Params",
    description:
      "Al recargar `/workspace?status=In+Progress&priority=High`, el estado inicial debe hidratarse exactamente desde `searchParams` sin sobrescribir la URL.",
    status: "Done",
    priority: "High",
    type: "bug",
    labels: ["Frontend", "DX"],
    timeSpentSeconds: 1800,
    completedDaysAgo: 7,
    createdDaysAgo: 16,
    sessions: [{ durationSeconds: 1800, mode: "stopwatch", daysAgo: 7 }],
  },
  {
    identifier: "ENG-103",
    title: "Añadir generador automático de Release Notes en Markdown",
    description:
      "Agrupar issues en estado `Done` dentro de un rango de fechas en secciones `Features`, `Bug Fixes` e `Improvements` con resumen de tiempo Focus.",
    status: "Done",
    priority: "High",
    type: "feature",
    labels: ["DX", "Frontend"],
    timeSpentSeconds: 4500,
    completedDaysAgo: 5,
    createdDaysAgo: 15,
    sessions: [
      { durationSeconds: 1500, mode: "pomodoro", daysAgo: 6 },
      { durationSeconds: 3000, mode: "pomodoro", daysAgo: 5 },
    ],
  },
  {
    identifier: "ENG-104",
    title: "Optimizar índice compuesto en SQLite para consultas de Changelog",
    description:
      "Reducir latencia de `GET /api/changelog` mediante índice en `(completed_at)` y proyección mínima de columnas.",
    status: "Done",
    priority: "Medium",
    type: "improvement",
    labels: ["Backend", "Performance"],
    timeSpentSeconds: 1500,
    completedDaysAgo: 3,
    createdDaysAgo: 14,
    sessions: [{ durationSeconds: 1500, mode: "pomodoro", daysAgo: 3 }],
  },
  {
    identifier: "ENG-105",
    title: "Sanitizar renderizado Markdown en el drawer para prevenir XSS",
    description:
      "Reemplazar interpolación HTML cruda por parser seguro basado en nodos React sin `dangerouslySetInnerHTML`.",
    status: "Done",
    priority: "Urgent",
    type: "bug",
    labels: ["Security", "Frontend"],
    timeSpentSeconds: 2400,
    completedDaysAgo: 1,
    createdDaysAgo: 12,
    sessions: [{ durationSeconds: 2400, mode: "stopwatch", daysAgo: 1 }],
  },
  {
    identifier: "ENG-106",
    title: "Modo Focus Pomodoro acoplado en el Drawer de detalle",
    description:
      "Permitir bloques de 25m Pomodoro, 5m Sprint y Stopwatch libre con registro persistente en `focus_sessions`.",
    status: "In Review",
    priority: "Urgent",
    type: "feature",
    labels: ["Frontend", "DX"],
    timeSpentSeconds: 3000,
    createdDaysAgo: 11,
    sessions: [
      { durationSeconds: 1500, mode: "pomodoro", daysAgo: 2 },
      { durationSeconds: 1500, mode: "pomodoro", daysAgo: 1 },
    ],
  },
  {
    identifier: "ENG-107",
    title: "Atajos de teclado estilo Linear (C, /, J, K, Enter, Esc)",
    description:
      "Navegación rápida en el workspace desactivando listeners cuando el foco esté dentro de `input`, `textarea` o `select`.",
    status: "In Review",
    priority: "High",
    type: "improvement",
    labels: ["Frontend", "DX"],
    timeSpentSeconds: 1500,
    createdDaysAgo: 10,
    sessions: [{ durationSeconds: 1500, mode: "pomodoro", daysAgo: 2 }],
  },
  {
    identifier: "ENG-108",
    title: "Validación estricta con Zod en payloads de creación y Focus",
    description:
      "Rechazar duraciones negativas, estados desconocidos y títulos vacíos con mensajes de error 400 estructurados.",
    status: "In Progress",
    priority: "High",
    type: "improvement",
    labels: ["Backend", "Security"],
    timeSpentSeconds: 1200,
    createdDaysAgo: 9,
    sessions: [{ durationSeconds: 1200, mode: "stopwatch", daysAgo: 1 }],
  },
  {
    identifier: "ENG-109",
    title: "Vista responsive 375px con sidebar colapsable para triaje móvil",
    description:
      "Asegurar que los controles de filtro, tabla de issues y drawer de Focus sean operables sin overflow horizontal en 375px.",
    status: "In Progress",
    priority: "Medium",
    type: "feature",
    labels: ["Frontend"],
    timeSpentSeconds: 900,
    createdDaysAgo: 8,
    sessions: [{ durationSeconds: 900, mode: "stopwatch", daysAgo: 1 }],
  },
  {
    identifier: "ENG-110",
    title:
      "Sugerencia automática de etiquetas basada en título con heurística AI",
    description:
      "Proponer etiquetas `Security`, `Performance` o `Frontend` al redactar nuevos issues mediante reglas semánticas ligeras.",
    status: "In Progress",
    priority: "Medium",
    type: "feature",
    labels: ["AI", "DX"],
    timeSpentSeconds: 600,
    createdDaysAgo: 7,
  },
  {
    identifier: "ENG-111",
    title: "Evitar salto de scroll al actualizar filtros en Next.js App Router",
    description:
      "Usar `router.replace(..., { scroll: false })` en cambios de estado del filter bar.",
    status: "Todo",
    priority: "Low",
    type: "bug",
    labels: ["Frontend", "Performance"],
    timeSpentSeconds: 0,
    createdDaysAgo: 6,
  },
  {
    identifier: "ENG-112",
    title: "Soporte de descarga directa CHANGELOG.md con nombre versionado",
    description:
      "Generar blob UTF-8 descargable como `CHANGELOG.md` y feedback visual al copiar al portapapeles.",
    status: "Todo",
    priority: "Medium",
    type: "feature",
    labels: ["DX", "Frontend"],
    timeSpentSeconds: 0,
    createdDaysAgo: 5,
  },
  {
    identifier: "ENG-113",
    title: "Rate limiting en endpoints de escritura para despliegues públicos",
    description:
      "Limitar ráfagas en `POST /api/issues` y `POST /api/issues/[id]/focus` cuando se ejecute tras proxy inverso.",
    status: "Todo",
    priority: "High",
    type: "improvement",
    labels: ["Backend", "Security"],
    timeSpentSeconds: 0,
    createdDaysAgo: 4,
  },
  {
    identifier: "ENG-114",
    title: "Resumen semanal de velocidad y tiempo Focus por etiqueta",
    description:
      "Agregar métricas comparativas de horas enfocadas entre `Frontend`, `Backend` y `AI` para retrospectivas.",
    status: "Backlog",
    priority: "Low",
    type: "feature",
    labels: ["AI", "Performance"],
    timeSpentSeconds: 0,
    createdDaysAgo: 3,
  },
  {
    identifier: "ENG-115",
    title: "Exportación de historial de sesiones Focus en formato CSV",
    description:
      "Permitir auditoría de bloques Pomodoro registrados por proyecto para reportes de ingeniería.",
    status: "Backlog",
    priority: "Low",
    type: "improvement",
    labels: ["Backend", "DX"],
    timeSpentSeconds: 0,
    createdDaysAgo: 2,
  },
  {
    identifier: "ENG-116",
    title: "Fuga de memoria menor al desmontar timer Focus activo",
    description:
      "Garantizar limpieza de `setInterval` al cerrar el drawer o cambiar de issue mientras corre el temporizador.",
    status: "Backlog",
    priority: "High",
    type: "bug",
    labels: ["Frontend", "Performance"],
    timeSpentSeconds: 0,
    createdDaysAgo: 1,
  },
];

function isoDaysAgo(daysAgo: number): string {
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  return date.toISOString();
}

export function seedDatabaseIfEmpty(sqlite: DatabaseSync): {
  seeded: boolean;
  issueCount: number;
} {
  const existing = sqlite
    .prepare("SELECT COUNT(*) as count FROM projects")
    .get() as { count: number } | undefined;

  if (existing && existing.count > 0) {
    const issueRow = sqlite
      .prepare("SELECT COUNT(*) as count FROM issues")
      .get() as { count: number } | undefined;
    return { seeded: false, issueCount: issueRow?.count ?? 0 };
  }

  sqlite.exec("BEGIN IMMEDIATE");
  try {
    const projectResult = sqlite
      .prepare(
        "INSERT INTO projects (key, name, description, issue_counter) VALUES (?, ?, ?, ?)",
      )
      .run(
        "ENG",
        "Pulse Core Platform",
        "Motor de triaje, sesiones Focus y generación automática de Release Notes.",
        116,
      );

    const projectId = Number(projectResult.lastInsertRowid);

    const insertLabel = sqlite.prepare(
      "INSERT INTO labels (name, color) VALUES (?, ?)",
    );
    const labelMap = new Map<string, number>();
    for (const label of SEED_LABELS) {
      const res = insertLabel.run(label.name, label.color);
      labelMap.set(label.name, Number(res.lastInsertRowid));
    }

    const insertIssue = sqlite.prepare(
      `INSERT INTO issues (
        identifier, project_id, title, description, status, priority, type,
        time_spent_seconds, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertIssueLabel = sqlite.prepare(
      "INSERT INTO issue_labels (issue_id, label_id) VALUES (?, ?)",
    );
    const insertSession = sqlite.prepare(
      "INSERT INTO focus_sessions (issue_id, duration_seconds, mode, created_at) VALUES (?, ?, ?, ?)",
    );

    for (const item of SEED_ISSUES) {
      const completedAt =
        item.completedDaysAgo !== undefined
          ? isoDaysAgo(item.completedDaysAgo)
          : null;
      const createdAt = isoDaysAgo(item.createdDaysAgo);

      const issueRes = insertIssue.run(
        item.identifier,
        projectId,
        item.title,
        item.description,
        item.status,
        item.priority,
        item.type,
        item.timeSpentSeconds,
        completedAt,
        createdAt,
      );
      const issueId = Number(issueRes.lastInsertRowid);

      for (const labelName of item.labels) {
        const labelId = labelMap.get(labelName);
        if (labelId !== undefined) {
          insertIssueLabel.run(issueId, labelId);
        }
      }

      if (item.sessions) {
        for (const session of item.sessions) {
          insertSession.run(
            issueId,
            session.durationSeconds,
            session.mode,
            isoDaysAgo(session.daysAgo),
          );
        }
      }
    }

    sqlite.exec("COMMIT");
    return { seeded: true, issueCount: SEED_ISSUES.length };
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
}
