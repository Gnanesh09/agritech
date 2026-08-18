import { Router } from "express";

import {
    protectRoute,
} from "../middleware/auth.middleware";

import * as automationController
    from "../controllers/automation.controller";

const automationRouter =
    Router();

automationRouter.post(
    "/devices/:id/automations",
    protectRoute,
    automationController.createAutomation
);

automationRouter.get(
    "/devices/:id/automations",
    protectRoute,
    automationController.getAutomations
);

automationRouter.patch(
    "/automations/:id/status",
    protectRoute,
    automationController.updateAutomationStatus
);

automationRouter.delete(
    "/automations/:id",
    protectRoute,
    automationController.deleteAutomation
);

export default automationRouter;