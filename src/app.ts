import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/index.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

export function createApp(): express.Application {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGINS === "*" ? true : config.CORS_ORIGINS.split(",").map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json());

  app.use("/api", apiRouter);

  app.use(errorHandler);
  return app;
}

