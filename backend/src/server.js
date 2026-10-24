import { parseEnvironment } from './config/environment.js';
import { configureRuntime } from './config/runtime.js';
import { openStore } from './config/store.js';
import { createApp } from './app.js';
import { auditService } from './services/auditService.js';
import { toolService } from './services/toolService.js';

const config = await configureRuntime(parseEnvironment());
const database = await openStore(config);
const tools = toolService(config);
const audits = auditService(database, tools);
await audits.start();
const server = createApp({ config, database, audits, tools }).listen(config.PORT, config.HOST, () => {
  console.log('Backend running on http://' + config.HOST + ':' + config.PORT + ' (' + database.kind + ')');
});
server.on('error', () => { console.error('Backend could not start. Check the port and configuration.'); process.exitCode = 1; });
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    await audits.stop(); await database.close(); clearTimeout(timeout);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
