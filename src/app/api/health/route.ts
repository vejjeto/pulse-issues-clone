import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { getRequestLogger } from "@/lib/logger";
import { getRequestId, jsonResponse } from "@/lib/problem-details";
import { count } from "drizzle-orm";
import type { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  try {
    const db = getDb();
    await db.select({ total: count() }).from(projects);
    const dbLatencyMs = Number((performance.now() - startedAt).toFixed(2));

    return jsonResponse(
      {
        status: "ok",
        service: "pulse-issues-clone",
        dbLatencyMs,
        uptimeSeconds: Math.floor(process.uptime()),
        version: "2.0.0",
        timestamp: new Date().toISOString(),
      },
      requestId,
      { status: 200 },
    );
  } catch (error) {
    const dbLatencyMs = Number((performance.now() - startedAt).toFixed(2));
    getRequestLogger(requestId).error(
      { err: error },
      "GET /api/health database check failed",
    );

    return jsonResponse(
      {
        status: "error",
        service: "pulse-issues-clone",
        dbLatencyMs,
        uptimeSeconds: Math.floor(process.uptime()),
        version: "2.0.0",
        timestamp: new Date().toISOString(),
      },
      requestId,
      { status: 503 },
    );
  }
}
