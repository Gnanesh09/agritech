import { Router } from "express";
import * as userController from "../controllers/user.controller";
import * as commandController from "../controllers/userCommand.controller";
import { protectRoute } from "../middleware/auth.middleware";

const userRouter = Router();

// Profile
userRouter.get("/profile", protectRoute, userController.getProfile);
userRouter.patch("/profile", protectRoute, userController.updateProfile);

// Devices
userRouter.get("/devices", protectRoute, userController.getMyDevices);
userRouter.post("/devices/claim", protectRoute, userController.claimDevice);
userRouter.get("/devices/:id", protectRoute, userController.getMyDevice);
userRouter.patch(
  "/devices/:id/name",
  protectRoute,
  userController.updateMyDeviceName,
);
userRouter.delete("/devices/:id", protectRoute, userController.unlinkDevice);

// Existing device telemetry/state/commands
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

// Rack
userRouter.get("/racks", protectRoute, userController.getMyRacks);
userRouter.get("/racks/:rackId", protectRoute, userController.getMyRack);
userRouter.patch("/racks/:rackId", protectRoute, userController.renameRack);
userRouter.patch(
  "/racks/:rackId/rows/:rowId",
  protectRoute,
  userController.updateRackRow,
);
userRouter.get(
  "/racks/:rackId/trays/:trayId/cycles",
  protectRoute,
  userController.getTrayCropCycles,
);
userRouter.patch(
  "/racks/:rackId/trays/:trayId",
  protectRoute,
  userController.updateRackTray,
);
userRouter.post(
  "/racks/:rackId/trays/:trayId/crop",
  protectRoute,
  userController.plantTrayCrop,
);

// Crop lifecycle
userRouter.patch(
  "/crop-cycles/:id",
  protectRoute,
  userController.updateCropCycle,
);
userRouter.post(
  "/crop-cycles/:id/harvest",
  protectRoute,
  userController.harvestCropCycle,
);
userRouter.post(
  "/crop-cycles/:id/cancel",
  protectRoute,
  userController.cancelCropCycle,
);

// ============================================================
// COMMUNITIES
// ============================================================

userRouter.get("/communities", protectRoute, userController.getCommunities);

userRouter.post("/communities", protectRoute, userController.createCommunity);

userRouter.post(
  "/communities/:communityId/join",
  protectRoute,
  userController.joinCommunity,
);

userRouter.delete(
  "/communities/:communityId/leave",
  protectRoute,
  userController.leaveCommunity,
);

// ============================================================
// MARKETPLACE LISTINGS
// ============================================================

userRouter.get(
  "/communities/:communityId/listings",
  protectRoute,
  userController.getCommunityListings,
);

userRouter.post(
  "/communities/:communityId/listings",
  protectRoute,
  userController.createCommunityListing,
);

userRouter.get(
  "/communities/:communityId/my-listings",
  protectRoute,
  userController.getMyCommunityListings,
);

userRouter.get(
  "/communities/:communityId/listings/:listingId",
  protectRoute,
  userController.getCommunityListing,
);

userRouter.patch(
  "/communities/:communityId/listings/:listingId",
  protectRoute,
  userController.updateCommunityListing,
);

userRouter.delete(
  "/communities/:communityId/listings/:listingId",
  protectRoute,
  userController.removeCommunityListing,
);

// ============================================================
// BUYING
// ============================================================

userRouter.post(
  "/communities/:communityId/listings/:listingId/orders",
  protectRoute,
  userController.createCommunityOrder,
);

// ============================================================
// ORDERS
// IMPORTANT: buying/selling routes come BEFORE :orderId
// ============================================================

userRouter.get(
  "/communities/:communityId/orders/buying",
  protectRoute,
  userController.getMyBuyingOrders,
);

userRouter.get(
  "/communities/:communityId/orders/selling",
  protectRoute,
  userController.getMySellingOrders,
);

userRouter.get(
  "/communities/:communityId/orders/:orderId",
  protectRoute,
  userController.getCommunityOrder,
);

userRouter.patch(
  "/communities/:communityId/orders/:orderId/status",
  protectRoute,
  userController.updateCommunityOrderStatus,
);

export default userRouter;
