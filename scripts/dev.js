import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvironment } from "../backend/src/config/environment.js";
import { configureRuntime } from "../backend/src/config/runtime.js";
import dotenv from "dotenv";

const root = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: resolve(root, "backend/.env"), quiet: true });
process.chdir(resolve(root, "backend"));
const config = await configureRuntime(parseEnvironment());
process.chdir(root);
const children = [];
function run(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env },
    windowsHide: true,
  });
  children.push(child);
  child.on("error", () => {
    console.error("Could not start " + command);
    process.exitCode = 1;
    stop();
  });
  child.on("exit", (code) => {
    if (code && !stopping) {
      process.exitCode = 1;
      stop();
    }
  });
}
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
run(process.execPath, ["src/server.js"], resolve(root, "backend"), {
  JWT_SECRET: config.JWT_SECRET,
  AGENT_SERVICE_TOKEN: config.AGENT_SERVICE_TOKEN,
});
console.log("AI tools run in Node.js; Python is not required.");
let existingFrontend = false;
try {
  const response = await fetch("http://127.0.0.1:5173/src/App.jsx", {
    signal: AbortSignal.timeout(1500),
  });
  const source = await response.text();
  existingFrontend =
    response.ok && source.includes("/src/pages/audits/AuditDetails.jsx");
} catch {}
if (existingFrontend)
  console.log("Using the existing AI SEO frontend on port 5173.");
else
  run(
    process.execPath,
    [resolve(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1"],
    resolve(root, "frontend"),
  );
console.log("Open http://127.0.0.1:5173 — press Ctrl+C to stop all services.");
