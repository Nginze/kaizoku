import type { ErrorRequestHandler, RequestHandler } from "express";
import createHttpError, { isHttpError } from "http-errors";
import pino from "pino";

const logger = pino({
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
			levelFirst: true,
			translateTime: "SYS:standard",
			ignore: "pid,hostname",
		},
	},
});

// Incoming request logger
const httpLogger: RequestHandler = (req, _, next) => {
	logger.info(`${req.method} ${req.url}`);
	next();
};

// Not found logger
const notFoundLogger: RequestHandler = (req, _, next) => {
	next(createHttpError(404, `Route ${req.url} not found`));
};

// Global error logger/handler
const errorLogger: ErrorRequestHandler = (err, _, res, next) => {
	logger.error(`Error: ${err.message}`);

	let statusCode = 500;
	let errorMessage = "Internal server error";

	if (isHttpError(err)) {
		statusCode = err.statusCode;
		errorMessage = err.message;
	}

	res.status(statusCode).json({
		error: {
			message: errorMessage,
		},
	});
};

export { logger, httpLogger, errorLogger, notFoundLogger };
