import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware";

type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export const authorizeRole =
  (...allowedRoles: Role[]) =>
  (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    // User must already be authenticated
    if (!req.userId || !req.userRole) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // Check role
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        message: "Forbidden - Insufficient permissions",
      });
    }

    next();
  };