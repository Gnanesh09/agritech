import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { protectRoute, protectRouteAdmin } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/authorizeRole";
import * as deviceController from"../controllers/deviceTelemetry.controller";
import { deviceAuth } from "../middleware/deviceAuth";
const deviceRouter = Router();

/**
 * POST /api/auth/register
 */

// devicemodels routes 
deviceRouter.post("/telemetry",deviceAuth,deviceController.receiveTelemetry);


export default deviceRouter