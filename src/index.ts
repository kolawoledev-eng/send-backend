import { createApp } from "./app.js";
import { config } from "./config/index.js";

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`Server listening on port ${config.PORT} (${config.NODE_ENV})`);
  console.log(`Stellar network: ${config.STELLAR_NETWORK}`);
});
