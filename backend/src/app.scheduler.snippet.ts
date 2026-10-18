// Add this import to your real src/app.ts (or server startup module that runs once):
import { startCropHarvestReminderScheduler } from "./services/crop-harvest-reminder.scheduler";

// Call once after environment variables are loaded and Prisma is configured:
startCropHarvestReminderScheduler();
