// Hostinger may load the entry with require(); keep asynchronous startup in a separate module.
void import("./scripts/start.js").catch(() => {
  console.error(
    "Startup failed. Check database, domain and environment configuration.",
  );
  process.exitCode = 1;
});
