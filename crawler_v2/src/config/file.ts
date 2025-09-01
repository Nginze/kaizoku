import { writeFileSync } from "fs";

export const saveToFile = (filename: string, data: any) => {
	writeFileSync(filename, JSON.stringify(data, null, 2));
};
