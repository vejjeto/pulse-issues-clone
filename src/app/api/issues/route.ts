import { readJsonBody } from "@/lib/api-utils";
import { parseFiltersFromSearchParams } from "@/lib/filters";
import { createIssue, listWorkspaceData } from "@/lib/issues-service";
import { getRequestLogger } from "@/lib/logger";
import {
  getRequestId,
  getRequestInstance,
  jsonResponse,
  problemResponse,
  zodProblemResponse,
} from "@/lib/problem-details";
import { createIssueSchema } from "@/lib/validation";
import type { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const instance = getRequestInstance(request);

  try {
    const url = new URL(request.url);
    const filters = parseFiltersFromSearchParams(url.searchParams);
    const data = await listWorkspaceData(filters);
    return jsonResponse(data, requestId);
  } catch (error) {
    getRequestLogger(requestId).error({ err: error }, "GET /api/issues failed");
    return problemResponse({
      status: 500,
      type: "https://pulse-issues.dev/errors/internal-error",
      title: "Internal Server Error",
      detail: "No se pudieron cargar los issues.",
      requestId,
      ...(instance ? { instance } : {}),
    });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const instance = getRequestInstance(request);

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

  const parsed = createIssueSchema.safeParse(body);
  if (!parsed.success) {
    return zodProblemResponse(parsed.error, requestId, instance);
  }

  try {
    const issue = await createIssue(parsed.data);
    return jsonResponse({ issue }, requestId, { status: 201 });
  } catch (error) {
    getRequestLogger(requestId).error(
      { err: error },
      "POST /api/issues failed",
    );
    return problemResponse({
      status: 500,
      type: "https://pulse-issues.dev/errors/internal-error",
      title: "Internal Server Error",
      detail: "No se pudo crear el issue.",
      requestId,
      ...(instance ? { instance } : {}),
    });
  }
}
