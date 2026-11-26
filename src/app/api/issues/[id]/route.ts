import { parsePositiveIntId, readJsonBody } from "@/lib/api-utils";
import {
  deleteIssue,
  getIssueById,
  listFocusSessionsForIssue,
  updateIssue,
} from "@/lib/issues-service";
import { getRequestLogger } from "@/lib/logger";
import {
  getRequestId,
  getRequestInstance,
  jsonResponse,
  problemResponse,
  zodProblemResponse,
} from "@/lib/problem-details";
import { updateIssueSchema } from "@/lib/validation";
import type { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function invalidIdResponse(
  requestId: string,
  instance: string | undefined,
): NextResponse {
  return problemResponse({
    status: 400,
    type: "https://pulse-issues.dev/errors/invalid-id",
    title: "Invalid Issue ID",
    detail: "El identificador de issue debe ser un entero positivo.",
    requestId,
    ...(instance ? { instance } : {}),
  });
}

function notFoundResponse(
  requestId: string,
  instance: string | undefined,
): NextResponse {
  return problemResponse({
    status: 404,
    type: "https://pulse-issues.dev/errors/not-found",
    title: "Issue Not Found",
    detail: "No existe ningún issue con el identificador indicado.",
    requestId,
    ...(instance ? { instance } : {}),
  });
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const instance = getRequestInstance(request);
  const { id: rawId } = await context.params;
  const id = parsePositiveIntId(rawId);

  if (!id) {
    return invalidIdResponse(requestId, instance);
  }

  try {
    const issue = await getIssueById(id);
    if (!issue) {
      return notFoundResponse(requestId, instance);
    }
    const sessions = await listFocusSessionsForIssue(id);
    return jsonResponse({ issue, sessions }, requestId);
  } catch (error) {
    getRequestLogger(requestId).error(
      { err: error, issueId: id },
      "GET /api/issues/[id] failed",
    );
    return problemResponse({
      status: 500,
      type: "https://pulse-issues.dev/errors/internal-error",
      title: "Internal Server Error",
      detail: "No se pudo obtener el issue.",
      requestId,
      ...(instance ? { instance } : {}),
    });
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const instance = getRequestInstance(request);
  const reqLog = getRequestLogger(requestId);
  const { id: rawId } = await context.params;
  const id = parsePositiveIntId(rawId);

  if (!id) {
    return invalidIdResponse(requestId, instance);
  }

  const body = await readJsonBody(request);
  if (body === null) {
    return problemResponse({
      status: 400,
      type: "https://pulse-issues.dev/errors/invalid-json",
      title: "Invalid JSON",
      detail: "El cuerpo de la petición debe ser JSON válido.",
      requestId,
      ...(instance ? { instance } : {}),
    });
  }

  const parsed = updateIssueSchema.safeParse(body);
  if (!parsed.success) {
    return zodProblemResponse(parsed.error, requestId, instance);
  }

  try {
    const previous =
      parsed.data.status === "Done" ? await getIssueById(id) : null;
    const updated = await updateIssue(id, parsed.data);

    if (!updated) {
      return notFoundResponse(requestId, instance);
    }

    if (
      parsed.data.status === "Done" &&
      previous &&
      previous.status !== "Done" &&
      updated.status === "Done"
    ) {
      reqLog.info(
        {
          event: "issue.completed",
          issueId: updated.id,
          identifier: updated.identifier,
          timeSpentSeconds: updated.timeSpentSeconds,
        },
        "Issue transitioned to Done",
      );
    }

    return jsonResponse({ issue: updated }, requestId);
  } catch (error) {
    reqLog.error({ err: error, issueId: id }, "PATCH /api/issues/[id] failed");
    return problemResponse({
      status: 500,
      type: "https://pulse-issues.dev/errors/internal-error",
      title: "Internal Server Error",
      detail: "No se pudo actualizar el issue.",
      requestId,
      ...(instance ? { instance } : {}),
    });
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const instance = getRequestInstance(request);
  const { id: rawId } = await context.params;
  const id = parsePositiveIntId(rawId);

  if (!id) {
    return invalidIdResponse(requestId, instance);
  }

  try {
    const removed = await deleteIssue(id);
    if (!removed) {
      return notFoundResponse(requestId, instance);
    }
    return jsonResponse({ deleted: true, id }, requestId);
  } catch (error) {
    getRequestLogger(requestId).error(
      { err: error, issueId: id },
      "DELETE /api/issues/[id] failed",
    );
    return problemResponse({
      status: 500,
      type: "https://pulse-issues.dev/errors/internal-error",
      title: "Internal Server Error",
      detail: "No se pudo eliminar el issue.",
      requestId,
      ...(instance ? { instance } : {}),
    });
  }
}
