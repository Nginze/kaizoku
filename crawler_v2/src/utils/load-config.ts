import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export const loadConfig = (configFilePath: string = "../../config.json") => {
	const filePath = path.join(__dirname, configFilePath);
	const data = readFileSync(filePath, "utf-8");
	if (existsSync(filePath)) {
		return JSON.parse(data);
	}
};

export const updateConfig = (updates: any, configFilePath: string = "../../config.json") => {
	const filePath = path.join(__dirname, configFilePath);
	
	let config = {};
	if (existsSync(filePath)) {
		const data = readFileSync(filePath, "utf-8");
		config = JSON.parse(data);
	}
	
	const updatedConfig = { ...config, ...updates };
	writeFileSync(filePath, JSON.stringify(updatedConfig, null, 2));
};
