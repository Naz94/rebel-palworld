import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import pino from "pino";

import { env } from "./env.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "./middleware/auth.js";
import { connectorsRouter } from "./routes/connectors.js";

const app = express();
const logger = pino();

const PORT = env.PORT;

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(
  express.json({
    limit: "256kb",
  }),
);

app.use("/connectors", connectorsRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "rebel-palworld-api",
  });
});

app.get("/me", requireAuth, (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  res.status(200).json({
    id: user.id,
    email: user.email ?? null,
  });
});

app.use((_req, res) => {
  res.status(404).json({
    error: "Not found",
  });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ err }, "Unhandled API error");

    res.status(500).json({
      error: "Internal server error",
    });
  },
);

app.listen(PORT, "127.0.0.1", () => {
  logger.info(
    {
      port: PORT,
      environment: env.NODE_ENV,
    },
    "Rebel Palworld API started",
  );
});