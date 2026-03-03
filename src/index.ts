import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { initDb } from "./db/client.js";

async function main() {
  const app = createApp();
  app.listen(config.PORT, () => {
    console.log(`Server listening on port ${config.PORT} (${config.NODE_ENV})`);
    console.log(`Stellar network: ${config.STELLAR_NETWORK}`);
  });

  // Initialize DB after binding so health checks can succeed even if DB is slow or fails
  try {
    await initDb();
  } catch (err) {
    console.error("Database init failed (server will keep running):", err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
