import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { protectRoute, protectRouteAdmin } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/authorizeRole";
import * as userController from "../controllers/user.controller";

import * as commandController from "../controllers/userCommand.controller";

const userRouter = Router();

/**
 * POST /api/auth/register
 */

// devicemodels routes
userRouter.get("/profile", protectRoute, userController.getProfile);
userRouter.patch("/profile", protectRoute, userController.updateProfile);
userRouter.get("/devices", protectRoute, userController.getMyDevices);
userRouter.post("/devices/claim", protectRoute, userController.claimDevice);
userRouter.get("/devices/:id", protectRoute, userController.getMyDevices);
userRouter.patch(
  "/devices/:id/name",
  protectRoute,
  userController.updateMyDeviceName,
);
userRouter.delete("/devices/:id", protectRoute, userController.unlinkDevice);
userRouter.get(
  "/devices/:id/telemetry",
  protectRoute,
  userController.getMyDeviceTelemetry,
);

userRouter.get(
  "/devices/:id/state",
  protectRoute,
  commandController.getDeviceState,
);

userRouter.post(
  "/devices/:id/commands",
  protectRoute,
  commandController.createCommand,
);

export default userRouter;
