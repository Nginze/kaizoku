import morgan, { StreamOptions } from "morgan";
import { logger } from "../config/logger.js";

const stream: StreamOptions = {
	write: (message: string) => logger.info(`${message}`),
};

export const httpLogger = morgan(
	":method :url :status :res[content-length] - :response-time ms :date[web]",
	{ stream },
);
