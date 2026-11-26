import { getEnv } from "@/lib/env";
import {
  createIssueSchema,
  focusSessionSchema,
  updateIssueBaseSchema,
} from "@/lib/validation";
import { z } from "zod";

type JsonSchema = Record<string, unknown>;

function isOptionalField(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) {
    return true;
  }
  if (schema instanceof z.ZodEffects) {
    return isOptionalField(schema.innerType());
  }
  return false;
}

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  if (schema instanceof z.ZodDefault) {
    return {
      ...zodToJsonSchema(schema._def.innerType),
      default: schema._def.defaultValue(),
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodEffects) {
    return zodToJsonSchema(schema.innerType());
  }
  if (schema instanceof z.ZodString) {
    const out: JsonSchema = { type: "string" };
    for (const check of schema._def.checks) {
      if (check.kind === "min") out.minLength = check.value;
      if (check.kind === "max") out.maxLength = check.value;
    }
    return out;
  }
  if (schema instanceof z.ZodNumber) {
    const isInt = schema._def.checks.some((c) => c.kind === "int");
    const out: JsonSchema = { type: isInt ? "integer" : "number" };
    for (const check of schema._def.checks) {
      if (check.kind === "min") out.minimum = check.value;
      if (check.kind === "max") out.maximum = check.value;
    }
    return out;
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: [...(schema._def.values as readonly string[])],
    };
  }
  if (schema instanceof z.ZodArray) {
    const out: JsonSchema = {
      type: "array",
      items: zodToJsonSchema(schema._def.type),
    };
    if (schema._def.minLength !== null) {
      out.minItems = schema._def.minLength.value;
    }
    if (schema._def.maxLength !== null) {
      out.maxItems = schema._def.maxLength.value;
    }
    return out;
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, fieldSchema] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(fieldSchema);
      if (!isOptionalField(fieldSchema)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  return { type: "object" };
}

interface RouteDef {
  path: string;
  method: "get" | "post" | "patch" | "delete";
  tag: string;
  summary: string;
  requestSchema?: z.ZodTypeAny;
  successStatus?: string;
}

const ROUTES: RouteDef[] = [
  {
    path: "/api/health",
    method: "get",
    tag: "Observability",
    summary:
      "Health check estandarizado con latencia de base de datos y uptime",
  },
  {
    path: "/api/issues",
    method: "get",
    tag: "Issues",
    summary:
      "Listar issues filtrados por status, priority, type, label y búsqueda q",
  },
  {
    path: "/api/issues",
    method: "post",
    tag: "Issues",
    summary: "Crear un issue con identificador atómico ENG-xxx",
    requestSchema: createIssueSchema,
    successStatus: "201",
  },
  {
    path: "/api/issues/{id}",
    method: "get",
    tag: "Issues",
    summary: "Obtener detalle de un issue e historial de sesiones Focus",
  },
  {
    path: "/api/issues/{id}",
    method: "patch",
    tag: "Issues",
    summary: "Actualizar campos o etiquetas de un issue",
    requestSchema: updateIssueBaseSchema,
  },
  {
    path: "/api/issues/{id}",
    method: "delete",
    tag: "Issues",
    summary: "Eliminar un issue por ID",
  },
  {
    path: "/api/issues/{id}/focus",
    method: "post",
    tag: "Focus",
    summary:
      "Registrar una sesión Focus (pomodoro/stopwatch) y acumular tiempo",
    requestSchema: focusSessionSchema,
    successStatus: "201",
  },
  {
    path: "/api/changelog",
    method: "get",
    tag: "Changelog",
    summary: "Compilar Release Notes en Markdown agrupadas desde issues Done",
  },
  {
    path: "/api/openapi.json",
    method: "get",
    tag: "Observability",
    summary: "Especificación OpenAPI 3.1.0 en JSON",
  },
];

export function getPulseIssuesOpenApiSpec(): Record<string, unknown> {
  const serverUrl = getEnv().NEXT_PUBLIC_APP_URL;
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of ROUTES) {
    const existingPath = paths[route.path] ?? {};
    const successCode = route.successStatus ?? "200";
    const operation: Record<string, unknown> = {
      tags: [route.tag],
      summary: route.summary,
      responses: {
        [successCode]: {
          description: "Respuesta exitosa",
        },
        "400": {
          description: "Error de validación (RFC 7807 Problem Details)",
          content: {
            "application/problem+json": {
              schema: { $ref: "#/components/schemas/ProblemDetails" },
            },
          },
        },
        "404": {
          description: "Recurso no encontrado (RFC 7807 Problem Details)",
          content: {
            "application/problem+json": {
              schema: { $ref: "#/components/schemas/ProblemDetails" },
            },
          },
        },
      },
    };

    if (route.requestSchema) {
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: zodToJsonSchema(route.requestSchema),
          },
        },
      };
    }

    existingPath[route.method] = operation;
    paths[route.path] = existingPath;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "PulseIssues API",
      version: "2.0.0",
      description:
        "API REST standalone para gestión de issues estilo Linear, sesiones Focus Pomodoro, Release Notes en Markdown y observabilidad RFC 7807.",
    },
    servers: [{ url: serverUrl }],
    paths,
    components: {
      schemas: {
        ProblemDetails: {
          type: "object",
          required: ["type", "title", "status", "detail"],
          properties: {
            type: { type: "string" },
            title: { type: "string" },
            status: { type: "integer" },
            detail: { type: "string" },
            instance: { type: "string" },
            errors: { type: "object" },
          },
        },
      },
    },
  };
}

export function renderScalarDocsHtml(options: {
  title: string;
  specUrl: string;
}): string {
  const safeTitle = options.title
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const safeUrl = options.specUrl.replaceAll('"', "&quot;");

  return `<!doctype html>
<html lang="es" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle} · OpenAPI 3.1.0</title>
    <style>
      body { margin: 0; background: #0b0c10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; }
      .topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #27272a; background: #0d0f14; }
      .topbar-left { display: flex; align-items: center; gap: 10px; }
      .badge { border: 1px solid #3f3f46; border-radius: 999px; padding: 2px 10px; font-size: 12px; color: #a1a1aa; }
      .link { color: #818cf8; font-size: 13px; text-decoration: none; }
      .wrap { max-width: 960px; margin: 24px auto; padding: 0 20px; }
      .card { background: #11131a; border: 1px solid #27272a; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
      .method { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; background: #4f46e5; color: #fff; margin-right: 8px; }
      pre { background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 12px; overflow: auto; font-size: 12px; }
      button { background: #4f46e5; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-left">
        <strong>${safeTitle}</strong>
        <span class="badge">OpenAPI 3.1.0</span>
      </div>
      <a class="link" href="${safeUrl}">${safeUrl}</a>
    </header>
    <main id="openapi-root" class="wrap"></main>
    <script>
      fetch("${safeUrl}").then(function (r) { return r.json(); }).then(function (spec) {
        var root = document.getElementById("openapi-root");
        var paths = spec.paths || {};
        Object.entries(paths).forEach(function (entry) {
          var path = entry[0], methods = entry[1];
          Object.entries(methods).forEach(function (mEntry) {
            var method = mEntry[0], op = mEntry[1];
            var card = document.createElement("div");
            card.className = "card";
            var row = document.createElement("div");
            row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:12px";
            var left = document.createElement("div");
            left.innerHTML = "<span class='method'>" + method + "</span><code>" + path + "</code><div style='color:#a1a1aa;font-size:13px;margin-top:6px'>" + (op.summary || "") + "</div>";
            var btn = document.createElement("button");
            btn.textContent = "Probar " + method.toUpperCase();
            var out = document.createElement("pre");
            out.style.display = "none";
            btn.onclick = async function () {
              out.style.display = "block";
              out.textContent = "Ejecutando...";
              try {
                var init = { method: method.toUpperCase(), headers: { "Content-Type": "application/json" } };
                if (method !== "get" && method !== "delete") init.body = "{}";
                var res = await fetch(path.replace(/\\{([^}]+)\\}/g, "demo"), init);
                out.textContent = "HTTP " + res.status + "\\n" + (await res.text()).slice(0, 1200);
              } catch (err) { out.textContent = String(err); }
            };
            row.appendChild(left);
            row.appendChild(btn);
            card.appendChild(row);
            card.appendChild(out);
            root.appendChild(card);
          });
        });
      });
    </script>
  </body>
</html>`;
}
