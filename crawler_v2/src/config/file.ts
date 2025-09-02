import { writeFileSync, readFileSync, existsSync } from "fs";

export const saveToFile = (filename: string, data: any) => {
	writeFileSync(filename, JSON.stringify(data, null, 2));
};

export const appendToFile = (filename: string, data: any) => {
	let existingData = [];
	
	if (existsSync(filename)) {
		try {
			const fileContent = readFileSync(filename, "utf-8");
			existingData = JSON.parse(fileContent);
		} catch (error) {
			existingData = [];
		}
	}
	
	if (Array.isArray(existingData)) {
		existingData.push(data);
	} else {
		existingData = [existingData, data];
	}
	
	writeFileSync(filename, JSON.stringify(existingData, null, 2));
};
