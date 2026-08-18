import type { Response } from "express";

import type { DeviceRequest } from "../middleware/deviceAuth";

import { prisma } from "../lib/prisma";
import type { Prisma } from "../../generated/prisma/client";

import {
  findCapability,
  normalizeCapabilities,
} from "../services/deviceCapabilities.service";

// ============================================================
// DEVICE POLLS FOR COMMANDS
// GET /api/device/commands
// ============================================================

export async function pollCommands(req: DeviceRequest, res: Response) {
  try {
    if (!req.device) {
      return res.status(401).json({
        message: "Device not authenticated",
      });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);

    const device = await prisma.device.findUnique({
      where: {
        id: req.device.id,
      },

      include: {
        deviceModel: true,
      },
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    const commands = await prisma.deviceCommand.findMany({
      where: {
        deviceId: device.id,

        status: "PENDING",
      },

      orderBy: {
        createdAt: "asc",
      },

      take: limit,
    });

    if (!commands.length) {
      await prisma.device.update({
        where: {
          id: device.id,
        },

        data: {
          lastSeenAt: new Date(),
        },
      });

      return res.status(200).json({
        commands: [],
      });
    }

    const commandIds = commands.map((command) => command.id);

    await prisma.deviceCommand.updateMany({
      where: {
        id: {
          in: commandIds,
        },

        status: "PENDING",
      },

      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return res.status(200).json({
      commands: commands.map((command) => ({
        id: command.id,

        ...toMutableJsonObject(command.command),
      })),
    });
  } catch (error) {
    console.error("Poll commands error:", error);

    return res.status(500).json({
      message: "Failed to fetch commands",
    });
  }
}

// ============================================================
// DEVICE ACKNOWLEDGES COMMAND
// POST /api/device/commands/:commandId/ack
// ============================================================

export async function acknowledgeCommand(req: DeviceRequest, res: Response) {
  try {
    if (!req.device) {
      return res.status(401).json({
        message: "Device not authenticated",
      });
    }

    const { commandId } = req.params;

    if (!commandId || Array.isArray(commandId)) {
      return res.status(400).json({
        message: "Invalid command ID",
      });
    }

    const { success, state, error } = req.body;

    if (typeof success !== "boolean") {
      return res.status(400).json({
        message: "success is required",
      });
    }

    const command = await prisma.deviceCommand.findFirst({
      where: {
        id: commandId,

        deviceId: req.device.id,
      },
    });

    if (!command) {
      return res.status(404).json({
        message: "Command not found",
      });
    }

    const device = await prisma.device.findUnique({
      where: {
        id: req.device.id,
      },

      include: {
        deviceModel: true,
      },
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    const capabilities = normalizeCapabilities(device.deviceModel.capabilities);

    const commandData = toMutableJsonObject(command.command);

    const target = commandData.target;

    /*
     * Validate reported actuator state
     * if supplied.
     */

    if (state !== undefined) {
      if (!target || typeof target !== "string") {
        return res.status(400).json({
          message: "Command target is invalid",
        });
      }

      const capability = findCapability(capabilities, target, "actuator");

      if (!capability) {
        return res.status(400).json({
          message: `Unsupported actuator: ${target}`,
        });
      }
    }

    const currentState = await prisma.deviceState.findUnique({
      where: {
        deviceId: device.id,
      },
    });

    const actual = toMutableJsonObject(currentState?.actual);

    const desired = toMutableJsonObject(currentState?.desired);

    const modes = toMutableJsonObject(currentState?.modes);

    if (success && state && typeof state === "object") {
      Object.assign(actual, state);
    }

    if (commandData.mode === "MANUAL" && target && typeof target === "string") {
      modes[target] = "MANUAL";
    }

    if (commandData.mode === "AUTO" && target && typeof target === "string") {
      modes[target] = "AUTO";
    }

    await prisma.$transaction(async (tx) => {
      await tx.deviceCommand.update({
        where: {
          id: command.id,
        },

        data: {
          status: success ? "ACKNOWLEDGED" : "FAILED",

          errorMessage: success
            ? null
            : String(error || "Device rejected command"),

          acknowledgedAt: new Date(),
        },
      });

      await tx.deviceState.upsert({
        where: {
          deviceId: device.id,
        },

        create: {
          deviceId: device.id,

          actual,

          desired,

          modes,

          lastReportedAt: success ? new Date() : null,
        },

        update: {
          actual,

          desired,

          modes,

          lastReportedAt: success ? new Date() : undefined,
        },
      });

      await tx.device.update({
        where: {
          id: device.id,
        },

        data: {
          lastSeenAt: new Date(),
        },
      });
    });

    return res.status(200).json({
      message: "Command acknowledgement received",

      commandId: command.id,

      success,
    });
  } catch (error) {
    console.error("Acknowledge command error:", error);

    return res.status(500).json({
      message: "Failed to acknowledge command",
    });
  }
}

// ============================================================
// HELPERS
// ============================================================

type MutableJsonObject = Record<string, Prisma.InputJsonValue>;
function toMutableJsonObject(value: unknown): MutableJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MutableJsonObject;
}
