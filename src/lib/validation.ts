import { z } from "zod";
import {
  FOCUS_MODES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
} from "./constants";

export const createIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(200, "El título no puede exceder 200 caracteres"),
  description: z
    .string()
    .max(5000, "La descripción no puede exceder 5000 caracteres")
    .default(""),
  status: z.enum(ISSUE_STATUSES).default("Todo"),
  priority: z.enum(ISSUE_PRIORITIES).default("Medium"),
  type: z.enum(ISSUE_TYPES).default("feature"),
  labelIds: z.array(z.number().int().positive()).max(10).default([]),
  projectKey: z.string().trim().min(1).max(10).default("ENG"),
});

export const updateIssueBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(200, "El título no puede exceder 200 caracteres")
    .optional(),
  description: z
    .string()
    .max(5000, "La descripción no puede exceder 5000 caracteres")
    .optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  type: z.enum(ISSUE_TYPES).optional(),
  labelIds: z.array(z.number().int().positive()).max(10).optional(),
});

export const updateIssueSchema = updateIssueBaseSchema.refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Debes enviar al menos un campo para actualizar",
  },
);

export const focusSessionSchema = z.object({
  durationSeconds: z
    .number()
    .int("La duración debe ser un número entero de segundos")
    .min(1, "La sesión debe durar al menos 1 segundo")
    .max(86400, "La duración máxima por sesión es 24 horas"),
  mode: z.enum(FOCUS_MODES).default("pomodoro"),
});

export const changelogQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  version: z.string().trim().min(1).max(40).default("v1.4.0"),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type FocusSessionInput = z.infer<typeof focusSessionSchema>;
