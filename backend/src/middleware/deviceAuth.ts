import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

export interface DeviceRequest extends Request {
    device?: {
        id: string;
        deviceCode: string;
    };
}

export async function deviceAuth(
    req: DeviceRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Device token required",
            });
        }

        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                message: "Device token required",
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const credential =
            await prisma.deviceCredential.findUnique({
                where: {
                    tokenHash,
                },
                include: {
                    device: true,
                },
            });

        if (!credential) {
            return res.status(401).json({
                message: "Invalid device token",
            });
        }

        const device = credential.device;

        if (
            device.status === "BLOCKED" ||
            device.status === "RETIRED"
        ) {
            return res.status(403).json({
                message: "Device is not active",
            });
        }

        await prisma.deviceCredential.update({
            where: {
                id: credential.id,
            },
            data: {
                lastUsedAt: new Date(),
            },
        });

        req.device = {
            id: device.id,
            deviceCode: device.deviceCode,
        };

        next();
    } catch (error) {
        console.error("Device authentication error:", error);

        return res.status(500).json({
            message: "Device authentication failed",
        });
    }
}