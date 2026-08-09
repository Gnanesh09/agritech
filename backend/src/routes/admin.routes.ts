import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { protectRoute, protectRouteAdmin } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/authorizeRole";
const adminRouter = Router();

/**
 * POST /api/auth/register
 */

// devicemodels routes 
adminRouter.post("/devicemodel", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.createDeviceModel);
adminRouter.get("/devicemodel", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN","USER"),adminController.getAllDeviceModel);
adminRouter.get("/devicemodel/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN","USER"),adminController.getDeviceModelById);
adminRouter.patch("/devicemodel/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.updateDeviceModel);
adminRouter.delete("/devicemodel/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.deleteDeviceModel);


// device routes
adminRouter.post("/devices/register", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.registerDevice);
adminRouter.get("/devices", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.getAllDevices);
adminRouter.get("/devices/stats", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.getDeviceStats);
adminRouter.get("/devices/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.getDevice);
adminRouter.patch("/devices/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.updateDevice);
adminRouter.patch("/devices/:id/status", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.updateDeviceStatus);
adminRouter.patch("/devices/:id", protectRouteAdmin,authorizeRole("ADMIN","SUPER_ADMIN"),adminController.updateDeviceStatus);






export default adminRouter;