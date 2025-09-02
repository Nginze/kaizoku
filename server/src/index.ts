import cors from "cors";
import "dotenv/config";
import express, { Request, Response } from "express";
import session, { Session } from "express-session";
import { httpLogger, logger } from "./config/logger";

import { router as indexRoutes } from "./api/index-routes";
import { cors as corsMiddleware } from "./middleware/cors";
import { session as sessionMiddleware } from "./middleware/session";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors(corsMiddleware));
app.use(session(sessionMiddleware));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(httpLogger);

app.use("/", indexRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(process.env.PORT || 5000, () => {
	logger.info(`listening on port ${process.env.PORT || 5000}`);
});
