import { addColors, transports, format, createLogger } from "winston";

const config = {
	levels: { error: 0, warn: 1, info: 2, http: 3, debug: 4 },
	colors: {
		http: "cyan",
		info: "bold blue", // fontStyle color
		warn: "italic yellow",
		error: "bold red",
		debug: "magenta",
	},
};

addColors(config.colors);

const f = format.combine(
	format.colorize({
		all: true,
	}),
	format.label({
		label: "[LOGGER]",
	}),
	format.timestamp({
		format: "YY-MM-DD HH:mm:ss",
	}),
	format.printf(
		(info) =>
			` ${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`,
	),
);

const transport =
	process.env.NODE_ENV !== "production"
		? new transports.Console({ format: f })
		: new transports.File({ filename: "server.log" });

export const logger = createLogger({
	level: "debug",
	transports: [transport],
});
