import { startupDiagnostic } from "./backend/src/utils/startupDiagnostic.js";
// Keep asynchronous startup outside this entry so Hostinger can load it with require().
void import("./scripts/start.js").catch((error) => {
  console.error("Startup failed: " + startupDiagnostic(error));
  process.exitCode = 1;
});
