import pino, { type Logger } from "pino";

const resolvedLevel =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "test" ? "silent" : "info");

export const logger: Logger = pino({
  level: resolvedLevel,
  base: {
    service: "pulse-issues-clone",
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.secret",
      "*.apiKey",
      "DATABASE_URL",
      "POSTGRES_URL",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function getRequestLogger(requestId: string): Logger {
  return logger.child({ requestId });
}
