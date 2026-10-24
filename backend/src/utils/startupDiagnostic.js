const guidance = {
  ER_ACCESS_DENIED_ERROR:
    "MySQL rejected the login. Check DB_USER and DB_PASSWORD and use the full prefixed username from hPanel.",
  ER_DBACCESS_DENIED_ERROR:
    "The MySQL user cannot access this database. Check its database assignment and DB_NAME.",
  ER_BAD_DB_ERROR:
    "MySQL could not find DB_NAME. Use the full prefixed database name from hPanel.",
  ECONNREFUSED:
    "The database connection was refused. On Hostinger check DB_HOST=127.0.0.1 and DB_PORT=3306.",
  ETIMEDOUT:
    "The database connection timed out. Check the database host and its availability.",
  ENOTFOUND:
    "The database hostname could not be resolved. On Hostinger use DB_HOST=127.0.0.1.",
  ER_PARSE_ERROR:
    "MySQL rejected a schema statement. Check the statement number below and the database server version.",
  ER_TABLEACCESS_DENIED_ERROR:
    "The database user lacks a required table permission. Review its permissions for this SEO database.",
  ER_CANNOT_USER:
    "MySQL rejected a database operation. Review the database user permissions.",
  ER_TOO_LONG_KEY:
    "The database rejected an index length. Check the schema statement and database server version.",
  ER_CANT_CREATE_TABLE:
    "MySQL could not create a table. Check the schema statement, foreign keys and database permissions.",
  ER_LOCK_WAIT_TIMEOUT:
    "Database initialization could not acquire a lock. Check whether another SEO deployment is still starting.",
  ERR_MODULE_NOT_FOUND:
    "An application file or dependency is missing. Check the repository root, entry file and dependency installation logs.",
  MODULE_NOT_FOUND:
    "An application file or dependency is missing. Check the repository root, entry file and dependency installation logs.",
  ERR_REQUIRE_ASYNC_MODULE:
    "The entry was loaded synchronously with an asynchronous dependency. Use the current server.js entry at the repository root.",
  EADDRINUSE:
    "The application port is already in use. Remove any manually configured PORT and use the platform-assigned port.",
};
const safeMessages = new Set([
  "Frontend build is missing.",
  "Production requires MySQL configuration.",
  "Production requires DB_NAME, DB_USER and JWT_SECRET of at least 32 characters",
  "Production requires an HTTPS FRONTEND_ORIGIN matching the temporary or custom domain.",
  "JWT_SECRET is required.",
  "JWT_SECRET must have at least 32 characters.",
  "DATABASE_URL must be a PostgreSQL URL",
  "LLM_API_URL must use HTTPS.",
  "SMTP_HOST requires SMTP_USER, SMTP_PASSWORD and MAIL_FROM",
  "Schema migration is already running",
]);
export function startupDiagnostic(error) {
  const code =
    typeof error?.code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)
      ? error.code
      : "";
  const message = String(error?.message || "");
  let detail = guidance[code];
  if (
    !detail &&
    (safeMessages.has(message) ||
      /^(?:Invalid environment configuration|Missing production environment variables): [A-Z0-9_, ]+$/.test(
        message,
      ))
  )
    detail = message;
  if (!detail)
    detail =
      "An unexpected startup error occurred. Check the error code and deployment build logs; no raw database queries or credentials are logged.";
  const statement = Number.isInteger(error?.schemaStatement)
    ? ` Schema statement: ${error.schemaStatement}.`
    : "";
  const errno = Number.isInteger(error?.errno)
    ? ` MySQL errno: ${error.errno}.`
    : "";
  return `${code ? "[" + code + "] " : ""}${detail}${statement}${errno}`;
}
