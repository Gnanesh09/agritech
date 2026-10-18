import { Router } from "express";
import * as userController from "../controllers/user.controller";
import * as commandController from "../controllers/userCommand.controller";
import { protectRoute } from "../middleware/auth.middleware";
import * as marketplaceController from "../controllers/marketplace.controller";
import * as mapsController from "../controllers/maps.controller";
import * as paymentController from "../controllers/payment.controller";
import * as imagekitController from "../controllers/imagekit.controller";
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

// Crop lifecycle and harvest tracking. Place static route before the :id routes.
userRouter.get(
  "/crop-cycles/harvest-due",
  protectRoute,
  userController.getHarvestDueCropCycles,
);
userRouter.get(
  "/crop-cycles/:id/time-remaining",
  protectRoute,
  userController.getCropCycleTimeRemaining,
);
userRouter.post(
  "/crop-cycles/:id/harvest-status",
  protectRoute,
  userController.recordCropHarvestStatus,
);
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

// userRouter.get("/communities", protectRoute, userController.getCommunities);

// userRouter.post("/communities", protectRoute, userController.createCommunity);

// userRouter.post(
//   "/communities/:communityId/join",
//   protectRoute,
//   userController.joinCommunity,
// );

// userRouter.delete(
//   "/communities/:communityId/leave",
//   protectRoute,
//   userController.leaveCommunity,
// );

// // ============================================================
// // MARKETPLACE LISTINGS
// // ============================================================

// userRouter.get(
//   "/communities/:communityId/listings",
//   protectRoute,
//   userController.getCommunityListings,
// );

// userRouter.post(
//   "/communities/:communityId/listings",
//   protectRoute,
//   userController.createCommunityListing,
// );

// userRouter.get(
//   "/communities/:communityId/my-listings",
//   protectRoute,
//   userController.getMyCommunityListings,
// );

// userRouter.get(
//   "/communities/:communityId/listings/:listingId",
//   protectRoute,
//   userController.getCommunityListing,
// );

// userRouter.patch(
//   "/communities/:communityId/listings/:listingId",
//   protectRoute,
//   userController.updateCommunityListing,
// );

// userRouter.delete(
//   "/communities/:communityId/listings/:listingId",
//   protectRoute,
//   userController.removeCommunityListing,
// );

// // ============================================================
// // BUYING
// // ============================================================

// userRouter.post(
//   "/communities/:communityId/listings/:listingId/orders",
//   protectRoute,
//   userController.createCommunityOrder,
// );

// // ============================================================
// // ORDERS
// // IMPORTANT: buying/selling routes come BEFORE :orderId
// // ============================================================

// userRouter.get(
//   "/communities/:communityId/orders/buying",
//   protectRoute,
//   userController.getMyBuyingOrders,
// );

// userRouter.get(
//   "/communities/:communityId/orders/selling",
//   protectRoute,
//   userController.getMySellingOrders,
// );

// userRouter.get(
//   "/communities/:communityId/orders/:orderId",
//   protectRoute,
//   userController.getCommunityOrder,
// );

// userRouter.patch(
//   "/communities/:communityId/orders/:orderId/status",
//   protectRoute,
//   userController.updateCommunityOrderStatus,
// );

// userRouter.post(
//   "/devices/check",
//   protectRoute,
//   userController.checkDeviceAvailability,
// );

// export default userRouter;

// Seller gets crops automatically from their existing grow records.
userRouter.get(
  "/marketplace/my-crops",
  protectRoute,
  marketplaceController.getSellableCrops,
);

// Locations: user can add/edit multiple locations anytime.
userRouter.get(
  "/marketplace/locations",
  protectRoute,
  marketplaceController.getMarketplaceLocations,
);
userRouter.post(
  "/marketplace/locations",
  protectRoute,
  marketplaceController.createMarketplaceLocation,
);
userRouter.patch(
  "/marketplace/locations/:locationId",
  protectRoute,
  marketplaceController.updateMarketplaceLocation,
);
userRouter.delete(
  "/marketplace/locations/:locationId",
  protectRoute,
  marketplaceController.deleteMarketplaceLocation,
);

// Listings.
userRouter.get(
  "/marketplace/listings",
  protectRoute,
  marketplaceController.getMarketplaceListings,
);
userRouter.post(
  "/marketplace/listings",
  protectRoute,
  marketplaceController.createMarketplaceListing,
);
userRouter.get(
  "/marketplace/listings/:listingId",
  protectRoute,
  marketplaceController.getMarketplaceListing,
);
userRouter.patch(
  "/marketplace/listings/:listingId",
  protectRoute,
  marketplaceController.updateMarketplaceListing,
);
userRouter.delete(
  "/marketplace/listings/:listingId",
  protectRoute,
  marketplaceController.removeMarketplaceListing,
);
userRouter.get(
  "/marketplace/my-listings",
  protectRoute,
  marketplaceController.getMyMarketplaceListings,
);

// Map mode.
userRouter.get(
  "/marketplace/map/listings",
  protectRoute,
  mapsController.getNearbyMarketplaceListings,
);
userRouter.post(
  "/marketplace/map/distance",
  protectRoute,
  mapsController.calculateMarketplaceDistance,
);
userRouter.post(
  "/marketplace/map/route",
  protectRoute,
  mapsController.calculateMarketplaceRoute,
);

// Orders - specific collection routes before :orderId.
userRouter.post(
  "/marketplace/orders",
  protectRoute,
  marketplaceController.createMarketplaceOrder,
);
userRouter.get(
  "/marketplace/orders/buying",
  protectRoute,
  marketplaceController.getBuyingOrders,
);
userRouter.get(
  "/marketplace/orders/selling",
  protectRoute,
  marketplaceController.getSellingOrders,
);
userRouter.get(
  "/marketplace/orders/:orderId",
  protectRoute,
  marketplaceController.getMarketplaceOrder,
);
userRouter.patch(
  "/marketplace/orders/:orderId/status",
  protectRoute,
  marketplaceController.updateMarketplaceOrderStatus,
);
userRouter.post(
  "/marketplace/orders/:orderId/cancel",
  protectRoute,
  marketplaceController.cancelMarketplaceOrder,
);

// Live delivery.
userRouter.post(
  "/marketplace/orders/:orderId/tracking/start",
  protectRoute,
  marketplaceController.startMarketplaceDelivery,
);
userRouter.post(
  "/marketplace/orders/:orderId/tracking/reached",
  protectRoute,
  marketplaceController.markMarketplaceOrderReached,
);

// Payments.
userRouter.post(
  "/marketplace/orders/:orderId/payment/create",
  protectRoute,
  paymentController.createOnlinePayment,
);
userRouter.post(
  "/marketplace/orders/:orderId/payment/verify",
  protectRoute,
  paymentController.verifyOnlinePayment,
);
userRouter.post(
  "/marketplace/orders/:orderId/payment/cash",
  protectRoute,
  marketplaceController.collectCashPayment,
);
userRouter.post(
  "/marketplace/orders/:orderId/payment/upi",
  protectRoute,
  marketplaceController.createDoorstepUpiPayment,
);

// Existing device check endpoint.
userRouter.post(
  "/devices/check",
  protectRoute,
  userController.checkDeviceAvailability,
);

// image kit auth connector
userRouter.get(
  "/imagekit/auth",
  protectRoute,
  imagekitController.getImageKitAuth,
);

export default userRouter;
