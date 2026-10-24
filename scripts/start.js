import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
const root = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: resolve(root, ".env"), quiet: true });
dotenv.config({ path: resolve(root, "backend/.env"), quiet: true });
// Keep existing local AI settings working while the deployment moves to Node.
const oldSettings = resolve(root, "agent/.env");
if (existsSync(oldSettings)) {
  const values = dotenv.parse(readFileSync(oldSettings));
  for (const key of [
    "LLM_API_KEY",
    "LLM_MODEL",
    "LLM_API_URL",
    "LLM_MAX_TOKENS",
  ])
    if (!process.env[key] && values[key]) process.env[key] = values[key];
}
if (process.argv.includes("--dev") && process.env.NODE_ENV !== "production") {
  await import("./dev.js");
} else {
  process.env.NODE_ENV = "production";
  process.env.HOST ||= "0.0.0.0";
  if (!existsSync(resolve(root, "frontend/dist/index.html")))
    throw new Error("Frontend build is missing.");
  process.chdir(resolve(root, "backend"));
  await import("../backend/src/server.js");
}
