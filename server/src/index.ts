import cors from "cors";
import "dotenv/config";
import express, { Request, Response } from "express";
import session, { Session } from "express-session";
import { httpLogger, logger } from "./config/logger.js";

import { router as indexRoutes } from "./api/index-routes.js";
import { router as proxyRoutes } from "./api/proxy-routes.js";
import { router as animeRoutes } from "./api/anime-routes.js";
import { router as authRoutes } from "./api/auth-routes.js";
import { cors as corsMiddleware } from "./middleware/cors.js";
import { session as sessionMiddleware } from "./middleware/session.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { connectDB } from "./config/mongo.js";

const app = express();

app.use(httpLogger);
app.use(cors(corsMiddleware));
app.use(session(sessionMiddleware));

// Has to be before json parsing middleware
app.use("/api/auth", authRoutes);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/", indexRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/anime", animeRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(process.env.PORT || 5000, async () => {
  try {
    await connectDB();
    logger.info(`listening on port ${process.env.PORT || 5000}`);
  } catch (error) {
    console.log(error);
  }
});
