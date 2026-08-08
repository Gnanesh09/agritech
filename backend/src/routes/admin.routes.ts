import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { protectRoute, protectRouteAdmin } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/authorizeRole";
const adminRouter = Router();

/**
 * POST /api/auth/register
 */
adminRouter.post("/devicemodel", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.createDeviceModel);
adminRouter.get("/devicemodel", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.getAllDeviceModel);
adminRouter.get("/devicemodel/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.getDeviceModelById);
adminRouter.patch("/devicemodel/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.updateDeviceModel);
adminRouter.delete("/devicemodel/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.deleteDeviceModel);





export default adminRouter;