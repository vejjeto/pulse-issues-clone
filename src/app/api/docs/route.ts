import { renderScalarDocsHtml } from "@/lib/openapi";
import { REQUEST_ID_HEADER, getRequestId } from "@/lib/problem-details";

export function GET(request: Request): Response {
  const requestId = getRequestId(request);
  const html = renderScalarDocsHtml({
    title: "PulseIssues API",
    specUrl: "/api/openapi.json",
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}
