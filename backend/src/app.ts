import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter from "./routes/auth.routes";
import adminRouter from "./routes/admin.routes";
import userRouter from "./routes/user.route";
import deviceRouter from "./routes/device.routes";
import automationRouter from "./routes/automation.routes";
import agronomistRouter from "./routes/agronomist.routes";
import { startCropHarvestReminderScheduler } from "./services/crop-harvest-reminder.scheduler";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/device", deviceRouter);
app.use("/api/user", automationRouter);
app.use("/api/user/agronomist", agronomistRouter);

// Start the crop-harvest reminder scheduler once.
startCropHarvestReminderScheduler();

export default app;
