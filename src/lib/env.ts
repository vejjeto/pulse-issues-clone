import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().trim().min(1).default("data/app.db"),
  POSTGRES_URL: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_APP_URL debe ser una URL válida")
    .default("http://localhost:3003"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
});

export interface AppEnv {
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL: string;
  POSTGRES_URL: string | undefined;
  NEXT_PUBLIC_APP_URL: string;
  LOG_LEVEL:
    | "fatal"
    | "error"
    | "warn"
    | "info"
    | "debug"
    | "trace"
    | "silent"
    | undefined;
}

const VALID_LOG_LEVELS = new Set([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

export function parseEnv(
  source: Record<string, string | undefined> = process.env,
): AppEnv {
  if (source.SKIP_ENV_VALIDATION === "true") {
    const nodeEnv =
      source.NODE_ENV === "production" || source.NODE_ENV === "test"
        ? source.NODE_ENV
        : "development";
    const logLevel =
      source.LOG_LEVEL && VALID_LOG_LEVELS.has(source.LOG_LEVEL)
        ? (source.LOG_LEVEL as AppEnv["LOG_LEVEL"])
        : undefined;

    return {
      NODE_ENV: nodeEnv,
      DATABASE_URL: source.DATABASE_URL?.trim() || "data/app.db",
      POSTGRES_URL: source.POSTGRES_URL?.trim() || undefined,
      NEXT_PUBLIC_APP_URL:
        source.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3003",
      LOG_LEVEL: logLevel,
    };
  }

  const parsed = envSchema.safeParse({
    NODE_ENV: source.NODE_ENV || undefined,
    DATABASE_URL: source.DATABASE_URL || undefined,
    POSTGRES_URL: source.POSTGRES_URL || undefined,
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL || undefined,
    LOG_LEVEL: source.LOG_LEVEL || undefined,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }

  return {
    NODE_ENV: parsed.data.NODE_ENV,
    DATABASE_URL: parsed.data.DATABASE_URL,
    POSTGRES_URL: parsed.data.POSTGRES_URL,
    NEXT_PUBLIC_APP_URL: parsed.data.NEXT_PUBLIC_APP_URL,
    LOG_LEVEL: parsed.data.LOG_LEVEL,
  };
}

export function getEnv(): AppEnv {
  return parseEnv(process.env);
}
