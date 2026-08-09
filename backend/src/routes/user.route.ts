import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { protectRoute, protectRouteAdmin } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/authorizeRole";
import * as userController from"../controllers/user.controller";
const userRouter = Router();

/**
 * POST /api/auth/register
 */

// devicemodels routes 
userRouter.get("/profile", protectRoute,userController.getProfile);
userRouter.patch("/profile", protectRoute,userController.updateProfile);
userRouter.get("/devices", protectRoute,userController.getMyDevices);
userRouter.post("/devices/claim", protectRoute,userController.claimDevice);
userRouter.get("/devices/:id", protectRoute,userController.getMyDevice);
userRouter.delete("/devices/:id", protectRoute,userController.getMyDevice);



export default userRouter;