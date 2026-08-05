import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/config";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  id: string;
  sessionId?: string;
}

export const protectRoute = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 1. GUARANTEE TOKEN EXISTS (Fixes the error near `token`)
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - Token missing" });
    }

    // 2. GUARANTEE SECRET EXISTS
    const secret = config.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in configuration");
    }

    // Both are guaranteed strings now, TypeScript will be happy!
    const decoded = jwt.verify(token, secret) as unknown as JwtPayload;

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Unauthorized - Invalid token payload" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.userId = user.id;

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized - Token expired" });
    }
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};