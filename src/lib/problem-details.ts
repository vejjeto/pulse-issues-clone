import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export const REQUEST_ID_HEADER = "x-request-id";
export const PROBLEM_CONTENT_TYPE = "application/problem+json; charset=utf-8";

export interface ProblemDetailsInput {
  status: number;
  title: string;
  detail: string;
  type?: string;
  instance?: string;
  requestId: string;
  errors?: Record<string, string[] | undefined>;
}

export function getRequestId(request?: Request): string {
  const incoming = request?.headers.get(REQUEST_ID_HEADER)?.trim();
  return incoming && incoming.length > 0 ? incoming : crypto.randomUUID();
}

export function getRequestInstance(request?: Request): string | undefined {
  if (!request) return undefined;
  try {
    return new URL(request.url).pathname;
  } catch {
    return undefined;
  }
}

export function problemResponse(input: ProblemDetailsInput): NextResponse {
  const body = {
    type: input.type ?? "about:blank",
    title: input.title,
    status: input.status,
    detail: input.detail,
    ...(input.instance ? { instance: input.instance } : {}),
    ...(input.errors ? { errors: input.errors } : {}),
  };

  return NextResponse.json(body, {
    status: input.status,
    headers: {
      "Content-Type": PROBLEM_CONTENT_TYPE,
      [REQUEST_ID_HEADER]: input.requestId,
    },
  });
}

export function jsonResponse<T>(
  data: T,
  requestId: string,
  init?: ResponseInit,
): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return NextResponse.json(data, {
    ...init,
    headers,
  });
}

export function zodProblemResponse(
  error: ZodError,
  requestId: string,
  instance?: string,
): NextResponse {
  return problemResponse({
    status: 400,
    type: "https://pulse-issues.dev/errors/validation-error",
    title: "Validation Error",
    detail: "Los datos enviados no cumplen el esquema esperado.",
    requestId,
    ...(instance ? { instance } : {}),
    errors: error.flatten().fieldErrors,
  });
}
