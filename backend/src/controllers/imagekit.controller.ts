import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import { generateImageKitUploadAuth } from "../services/imagekit.service";

export function getImageKitAuth(req: AuthRequest, res: Response) {
  if (!req.userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const auth = generateImageKitUploadAuth();

    return res.status(200).json(auth);
  } catch (error) {
    console.error("ImageKit authorization error:", error);

    return res.status(500).json({
      message: "Failed to generate ImageKit upload authorization.",
    });
  }
}
