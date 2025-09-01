import { existsSync, readFileSync } from "fs";
import path from "path";

export const loadConfig = (configFilePath: string = "../../config.json") => {
	const filePath = path.join(__dirname, configFilePath);
	const data = readFileSync(filePath, "utf-8");
	if (existsSync(filePath)) {
		return JSON.parse(data);
	}
};
