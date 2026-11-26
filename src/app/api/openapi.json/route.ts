import { getPulseIssuesOpenApiSpec } from "@/lib/openapi";
import { getRequestId, jsonResponse } from "@/lib/problem-details";
import type { NextResponse } from "next/server";

export function GET(request: Request): NextResponse {
  const requestId = getRequestId(request);
  return jsonResponse(getPulseIssuesOpenApiSpec(), requestId);
}
