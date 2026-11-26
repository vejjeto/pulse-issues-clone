import { generateReleaseNotesMarkdown } from "@/lib/changelog";
import { listWorkspaceData } from "@/lib/issues-service";
import { getRequestLogger } from "@/lib/logger";
import {
  getRequestId,
  getRequestInstance,
  jsonResponse,
  problemResponse,
  zodProblemResponse,
} from "@/lib/problem-details";
import { changelogQuerySchema } from "@/lib/validation";
import type { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const instance = getRequestInstance(request);
  const url = new URL(request.url);

  const parsed = changelogQuerySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    version: url.searchParams.get("version") ?? undefined,
  });

  if (!parsed.success) {
    return zodProblemResponse(parsed.error, requestId, instance);
  }

  try {
    const { issues } = await listWorkspaceData({ status: "Done" });
    const result = generateReleaseNotesMarkdown(issues, parsed.data);
    return jsonResponse(result, requestId);
  } catch (error) {
    getRequestLogger(requestId).error(
      { err: error },
      "GET /api/changelog failed",
    );
    return problemResponse({
      status: 500,
      type: "https://pulse-issues.dev/errors/internal-error",
      title: "Internal Server Error",
      detail: "No se pudieron generar las Release Notes.",
      requestId,
      ...(instance ? { instance } : {}),
    });
  }
}
