import type { Response } from "express";
import type { DeviceRequest } from "../middleware/deviceAuth";
import { prisma } from "../lib/prisma";

export async function receiveTelemetry(
    req: DeviceRequest,
    res: Response
) {
    try {
        if (!req.device) {
            return res.status(401).json({
                message: "Device not authenticated",
            });
        }

        const {
            temperature,
            humidity,
        } = req.body;

        if (
            temperature !== undefined &&
            typeof temperature !== "number"
        ) {
            return res.status(400).json({
                message: "Invalid temperature",
            });
        }

        if (
            humidity !== undefined &&
            typeof humidity !== "number"
        ) {
            return res.status(400).json({
                message: "Invalid humidity",
            });
        }

        if (
            temperature === undefined &&
            humidity === undefined
        ) {
            return res.status(400).json({
                message: "No telemetry data provided",
            });
        }

        const telemetry =
            await prisma.deviceTelemetry.create({
                data: {
                    deviceId: req.device.id,
                    temperature:
                        temperature ?? null,
                    humidity:
                        humidity ?? null,
                },
            });

        return res.status(201).json({
            message: "Telemetry received",

            telemetry: {
                id: telemetry.id,
                deviceCode:
                    req.device.deviceCode,
                temperature:
                    telemetry.temperature,
                humidity:
                    telemetry.humidity,
                recordedAt:
                    telemetry.recordedAt,
            },
        });
    } catch (error) {
        console.error(
            "Telemetry error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to save telemetry",
        });
    }
}