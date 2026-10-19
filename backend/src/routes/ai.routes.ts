import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware";
import { parseCropPdfUpload } from "../middleware/aiUpload";
import * as aiController from "../controllers/ai.controller";

const aiRouter = Router();

// Temporary conversations: start -> send any number of messages -> delete/end.
aiRouter.post("/sessions", protectRoute, aiController.createChatSession);
aiRouter.post(
  "/sessions/:sessionId/messages",
  protectRoute,
  aiController.sendChatMessage,
);
aiRouter.delete("/sessions/:sessionId", protectRoute, aiController.endChatSession);

// Shared agronomy PDFs are admin-only inside the controller.
aiRouter.post(
  "/documents",
  protectRoute,
  parseCropPdfUpload,
  aiController.ingestCropPdf,
);

export default aiRouter;
