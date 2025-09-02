import { scheduleHourlyTask, worker } from "./scheduler";
import { logger } from "../config/logger";

export const initializeJobs = async () => {
	try {
		// Schedule the hourly task
		await scheduleHourlyTask();
		
		logger.info("🚀 Job scheduler initialized");
	} catch (error) {
		logger.error("Failed to initialize job scheduler:", error);
		throw error;
	}
};

export { worker };