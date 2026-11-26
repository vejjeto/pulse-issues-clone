import type { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getRequestId, zodProblemResponse } from "./problem-details";

export function parsePositiveIntId(rawId: string): number | null {
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function zodBadRequest(
  error: ZodError,
  requestId = getRequestId(),
  instance?: string,
): NextResponse {
  return zodProblemResponse(error, requestId, instance);
}

export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}
