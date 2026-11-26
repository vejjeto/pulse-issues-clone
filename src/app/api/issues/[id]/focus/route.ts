import { parsePositiveIntId, readJsonBody } from "@/lib/api-utils";
import { recordFocusSession } from "@/lib/issues-service";
import { getRequestLogger } from "@/lib/logger";
import {
  getRequestId,
  getRequestInstance,
  jsonResponse,
  problemResponse,
  zodProblemResponse,
} from "@/lib/problem-details";
import { focusSessionSchema } from "@/lib/validation";
import type { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const instance = getRequestInstance(request);
  const { id: rawId } = await context.params;
  const id = parsePositiveIntId(rawId);

  if (!id) {
    return problemResponse({
      status: 400,
      type: "https://pulse-issues.dev/errors/invalid-id",
      title: "Invalid Issue ID",
      detail: "El identificador de issue debe ser un entero positivo.",
      requestId,
      ...(instance ? { instance } : {}),
    });
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

  const parsed = focusSessionSchema.safeParse(body);
  if (!parsed.success) {
    return zodProblemResponse(parsed.error, requestId, instance);
  }

  try {
    const result = await recordFocusSession(id, parsed.data);
    if (!result) {
      return problemResponse({
        status: 404,
        type: "https://pulse-issues.dev/errors/not-found",
        title: "Issue Not Found",
        detail: "No existe ningún issue con el identificador indicado.",
        requestId,
        ...(instance ? { instance } : {}),
      });
    }
    return jsonResponse(result, requestId, { status: 201 });
  } catch (error) {
    getRequestLogger(requestId).error(
      { err: error, issueId: id },
      "POST /api/issues/[id]/focus failed",
    );
    return problemResponse({
      status: 500,
      type: "https://pulse-issues.dev/errors/internal-error",
      title: "Internal Server Error",
      detail: "No se pudo registrar la sesión Focus.",
      requestId,
      ...(instance ? { instance } : {}),
    });
  }
}
