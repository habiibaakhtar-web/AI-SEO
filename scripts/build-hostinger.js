import { spawnSync } from "node:child_process";
import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(
  process.execPath,
  [resolve(root, "node_modules/vite/bin/vite.js"), "build"],
  { cwd: resolve(root, "frontend"), stdio: "inherit", windowsHide: true },
);
if (result.status !== 0) process.exit(result.status || 1);
const output = resolve(root, "hostinger");
// This generated deployment folder contains no local data or environment secrets.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of [
  "package.json",
  "package-lock.json",
  "server.js",
  "hostinger.env.example",
])
  await copyFile(resolve(root, file), resolve(output, file));
for (const folder of ["backend/src", "frontend/src", "frontend/public"])
  await cp(resolve(root, folder), resolve(output, folder), {
    recursive: true,
    force: true,
  }).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
for (const file of [
  "backend/package.json",
  "frontend/package.json",
  "frontend/index.html",
  "frontend/vite.config.js",
  "scripts/start.js",
  "scripts/build-hostinger.js",
  "docs/hostinger.md",
]) {
  await mkdir(resolve(output, file, ".."), { recursive: true });
  await copyFile(resolve(root, file), resolve(output, file));
}
await cp(resolve(root, "frontend/dist"), resolve(output, "frontend/dist"), {
  recursive: true,
});
console.log(
  "Hostinger source and built frontend prepared in hostinger/. No .env, Python environment or local database is included.",
);
