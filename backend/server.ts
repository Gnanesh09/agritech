import app from "./src/app";
import connectDB from "./src/db/db";
import { startCropHarvestReminderScheduler } from "./src/services/crop-harvest-reminder.scheduler";

const PORT = Number(process.env.PORT) || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on PORT: ${PORT}`);

      // Start crop harvest reminder background scheduler
      startCropHarvestReminderScheduler();
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
