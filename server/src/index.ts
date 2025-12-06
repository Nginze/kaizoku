import cors from "cors";
import "dotenv/config";
import express, { Request, Response } from "express";
import session, { Session } from "express-session";
import { httpLogger, logger } from "./config/logger";

import { router as indexRoutes } from "./api/index-routes";
import { router as proxyRoutes } from "./api/proxy-routes";
import { router as animeRoutes } from "./api/anime-routes";
import { cors as corsMiddleware } from "./middleware/cors";
import { session as sessionMiddleware } from "./middleware/session";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { connectDB } from "./config/mongo";
import { embedQueue } from "./config/bull";

import "./workers/embed.worker";

const app = express();

app.use(cors(corsMiddleware));
app.use(session(sessionMiddleware));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(httpLogger);

app.use("/", indexRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/anime", animeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(process.env.PORT || 5000, async () => {
  try {
    await connectDB();
    await embedQueue.add(
      "init-embed-job",
      {},
      {
        repeat: {
          every: 1000 * 60 * 0.5,
        },
      }
    );
    logger.info(`listening on port ${process.env.PORT || 5000}`);
    logger.info("Embed queue initialized");
  } catch (error) {
    console.log(error);
  }
});
