import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  HOST: z.string().default("127.0.0.1"),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().default(""),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().default(""),
  DB_USER: z.string().default(""),
  DB_PASSWORD: z.string().default(""),
  LLM_API_KEY: z.string().default(""),
  LLM_MODEL: z.string().default("openrouter/auto"),
  LLM_API_URL: z
    .string()
    .url()
    .default("https://openrouter.ai/api/v1/chat/completions"),
  LLM_MAX_TOKENS: z.coerce.number().int().min(256).max(16000).default(4096),
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  JWT_SECRET: z.string().default(""),
  AGENT_URL: z.string().url().default("http://127.0.0.1:8000"),
  AGENT_SERVICE_TOKEN: z.string().default(""),
  DATA_DIR: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  MAIL_FROM: z.string().default(""),
});

export function parseEnvironment(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ];
    throw new Error(`Invalid environment configuration: ${fields.join(", ")}`);
  }
  const config = result.data;
  if (
    config.SMTP_HOST &&
    (!config.SMTP_USER || !config.SMTP_PASSWORD || !config.MAIL_FROM)
  )
    throw new Error(
      "SMTP_HOST requires SMTP_USER, SMTP_PASSWORD and MAIL_FROM",
    );
  if (config.DATABASE_URL) {
    let url;
    try {
      url = new URL(config.DATABASE_URL);
    } catch {
      throw new Error("DATABASE_URL must be a PostgreSQL URL");
    }
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new Error("DATABASE_URL must be a PostgreSQL URL");
  }
  if (
    config.NODE_ENV === "production" &&
    (!(config.DB_NAME && config.DB_USER) || config.JWT_SECRET.length < 32)
  ) {
    throw new Error(
      "Production requires DB_NAME, DB_USER and JWT_SECRET of at least 32 characters",
    );
  }
  if (
    config.NODE_ENV === "production" &&
    new URL(config.FRONTEND_ORIGIN).protocol !== "https:"
  )
    throw new Error(
      "Production requires an HTTPS FRONTEND_ORIGIN matching the temporary or custom domain.",
    );
  if (config.LLM_API_KEY && new URL(config.LLM_API_URL).protocol !== "https:")
    throw new Error("LLM_API_URL must use HTTPS.");
  return Object.freeze(config);
}
