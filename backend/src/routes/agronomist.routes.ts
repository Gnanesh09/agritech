import { Router } from "express";
import { chat, getAvailability } from "../controllers/agronomist.controller";
import { protectRoute } from "../middleware/auth.middleware";

const agronomistRouter = Router();

agronomistRouter.get("/status", protectRoute, getAvailability);
agronomistRouter.post("/chat", protectRoute, chat);

export default agronomistRouter;
