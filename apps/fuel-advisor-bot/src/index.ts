import { config } from './config/env';
import { startBot } from './bot/bot';
import { initDb } from './db/index';
import { startScheduler } from './jobs/scheduler';

async function main() {
  await initDb();
  startBot();
  startScheduler();
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});
