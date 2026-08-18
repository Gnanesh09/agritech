import { Router } from "express";

import { deviceAuth } from "../middleware/deviceAuth";

import * as deviceController from "../controllers/deviceTelemetry.controller";

import * as commandController from "../controllers/deviceCommand.controller";

const deviceRouter = Router();

// ============================================================
// TELEMETRY
// ============================================================

deviceRouter.post("/telemetry", deviceAuth, deviceController.receiveTelemetry);

// ============================================================
// DEVICE COMMANDS
// ============================================================

deviceRouter.get("/commands", deviceAuth, commandController.pollCommands);

deviceRouter.post(
  "/commands/:commandId/ack",
  deviceAuth,
  commandController.acknowledgeCommand,
);

export default deviceRouter;
