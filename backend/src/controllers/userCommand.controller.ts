import type { Response } from "express";

import type { AuthRequest } from "../middleware/auth.middleware";

import { prisma } from "../lib/prisma";

import {
  findCapability,
  normalizeCapabilities,
} from "../services/deviceCapabilities.service";
import type { Prisma } from "../../generated/prisma/client";

// ============================================================
// CREATE COMMAND
// POST /api/user/devices/:id/commands
// ============================================================

export async function createCommand(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }

    const { target, action = "set", value, mode = "MANUAL" } = req.body;

    if (typeof target !== "string" || !target.trim()) {
      return res.status(400).json({
        message: "target is required",
      });
    }

    if (!["MANUAL", "AUTO"].includes(mode)) {
      return res.status(400).json({
        message: "mode must be MANUAL or AUTO",
      });
    }

    const userDevice = await prisma.userDevice.findFirst({
      where: {
        userId: req.userId,

        deviceId: id,
      },

      include: {
        device: {
          include: {
            deviceModel: true,
          },
        },
      },
    });

    if (!userDevice) {
      return res.status(404).json({
        message: "Device not found or does not belong to you",
      });
    }

    const device = userDevice.device;

    const capabilities = normalizeCapabilities(device.deviceModel.capabilities);

    const capability = findCapability(capabilities, target, "actuator");

    if (!capability) {
      return res.status(400).json({
        message: `Device does not support actuator: ${target}`,
      });
    }

    // ------------------------------------------------------
    // Validate value
    // ------------------------------------------------------

    if (capability.type === "boolean" && typeof value !== "boolean") {
      return res.status(400).json({
        message: `${target} requires a boolean value`,
      });
    }

    if (capability.type === "number" && typeof value !== "number") {
      return res.status(400).json({
        message: `${target} requires a number value`,
      });
    }

    if (capability.type === "string" && typeof value !== "string") {
      return res.status(400).json({
        message: `${target} requires a string value`,
      });
    }

    if (
      typeof value === "number" &&
      capability.min !== undefined &&
      value < capability.min
    ) {
      return res.status(400).json({
        message: `${target} is below minimum`,
      });
    }

    if (
      typeof value === "number" &&
      capability.max !== undefined &&
      value > capability.max
    ) {
      return res.status(400).json({
        message: `${target} is above maximum`,
      });
    }

    // ------------------------------------------------------
    // Current state
    // ------------------------------------------------------

    const currentState = await prisma.deviceState.findUnique({
      where: {
        deviceId: device.id,
      },
    });
    const desired = toMutableJsonObject(currentState?.desired);

    const modes = toMutableJsonObject(currentState?.modes);

    desired[target] = value;

    modes[target] = mode;

    // ------------------------------------------------------
    // Create command
    // ------------------------------------------------------

    const command = await prisma.$transaction(async (tx) => {
      const created = await tx.deviceCommand.create({
        data: {
          deviceId: device.id,

          command: {
            target,
            action,
            value,
            mode,
          },

          source: "USER",
        },
      });

      await tx.deviceState.upsert({
        where: {
          deviceId: device.id,
        },

        create: {
          deviceId: device.id,

          actual: currentState?.actual ?? {},

          desired,

          modes,
        },

        update: {
          desired,
          modes,
        },
      });

      return created;
    });

    return res.status(201).json({
      message: "Command created",

      command: {
        id: command.id,

        deviceId: command.deviceId,

        target,

        action,

        value,

        mode,

        status: command.status,

        createdAt: command.createdAt,
      },
    });
  } catch (error) {
    console.error("Create command error:", error);

    return res.status(500).json({
      message: "Failed to create command",
    });
  }
}

// ============================================================
// GET STATE
// GET /api/user/devices/:id/state
// ============================================================

export async function getDeviceState(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }

    const userDevice = await prisma.userDevice.findFirst({
      where: {
        userId: req.userId,

        deviceId: id,
      },
    });

    if (!userDevice) {
      return res.status(404).json({
        message: "Device not found or does not belong to you",
      });
    }

    const state = await prisma.deviceState.findUnique({
      where: {
        deviceId: id,
      },
    });

    return res.status(200).json({
      deviceId: id,

      state: state
        ? {
            actual: state.actual,

            desired: state.desired,

            modes: state.modes,

            lastReportedAt: state.lastReportedAt,
          }
        : {
            actual: {},
            desired: {},
            modes: {},
            lastReportedAt: null,
          },
    });
  } catch (error) {
    console.error("Get device state error:", error);

    return res.status(500).json({
      message: "Failed to get device state",
    });
  }
}

type MutableJsonObject = Record<string, Prisma.InputJsonValue>;

function toMutableJsonObject(value: unknown): MutableJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MutableJsonObject;
}
