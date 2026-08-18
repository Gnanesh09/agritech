import type { Response } from "express";

import type { AuthRequest } from "../middleware/auth.middleware";

import { prisma } from "../lib/prisma";

import {
  findCapability,
  normalizeCapabilities,
} from "../services/deviceCapabilities.service";

// ============================================================
// CREATE AUTOMATION
// POST /api/user/devices/:id/automations
// ============================================================

export async function createAutomation(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    const { name, trigger, actions } = req.body;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Automation name is required",
      });
    }

    if (!trigger || typeof trigger !== "object") {
      return res.status(400).json({
        message: "Invalid trigger",
      });
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        message: "At least one action is required",
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

    const capabilities = normalizeCapabilities(
      userDevice.device.deviceModel.capabilities,
    );

    if (typeof trigger.field !== "string") {
      return res.status(400).json({
        message: "trigger.field is required",
      });
    }

    const sensor = findCapability(capabilities, trigger.field, "sensor");

    if (!sensor) {
      return res.status(400).json({
        message: `Sensor not supported: ${trigger.field}`,
      });
    }

    for (const action of actions) {
      if (!action || typeof action.target !== "string") {
        return res.status(400).json({
          message: "Invalid automation action",
        });
      }

      const actuator = findCapability(capabilities, action.target, "actuator");

      if (!actuator) {
        return res.status(400).json({
          message: `Actuator not supported: ${action.target}`,
        });
      }
    }

    const automation = await prisma.deviceAutomation.create({
      data: {
        userId: req.userId,

        deviceId: id,

        name: name.trim(),

        trigger,

        actions,
      },
    });

    return res.status(201).json({
      message: "Automation created",

      automation,
    });
  } catch (error) {
    console.error("Create automation error:", error);

    return res.status(500).json({
      message: "Failed to create automation",
    });
  }
}

// ============================================================
// GET AUTOMATIONS
// GET /api/user/devices/:id/automations
// ============================================================

export async function getAutomations(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const id = getParamId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }

    const automations = await prisma.deviceAutomation.findMany({
      where: {
        userId: req.userId,

        deviceId: id,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      automations,
    });
  } catch (error) {
    console.error("Get automations error:", error);

    return res.status(500).json({
      message: "Failed to fetch automations",
    });
  }
}

// ============================================================
// UPDATE STATUS
// PATCH /api/user/automations/:id/status
// ============================================================

export async function updateAutomationStatus(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const id = getParamId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid automation/device ID",
      });
    }

    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        message: "enabled must be boolean",
      });
    }

    const automation = await prisma.deviceAutomation.findFirst({
      where: {
        id,

        userId: req.userId,
      },
    });

    if (!automation) {
      return res.status(404).json({
        message: "Automation not found",
      });
    }

    const updated = await prisma.deviceAutomation.update({
      where: {
        id,
      },

      data: {
        status: enabled ? "ACTIVE" : "PAUSED",
      },
    });

    return res.status(200).json({
      message: "Automation updated",

      automation: updated,
    });
  } catch (error) {
    console.error("Update automation error:", error);

    return res.status(500).json({
      message: "Failed to update automation",
    });
  }
}

// ============================================================
// DELETE
// DELETE /api/user/automations/:id
// ============================================================

export async function deleteAutomation(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const id = getParamId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid automation/device ID",
      });
    }

    const automation = await prisma.deviceAutomation.findFirst({
      where: {
        id,

        userId: req.userId,
      },
    });

    if (!automation) {
      return res.status(404).json({
        message: "Automation not found",
      });
    }

    await prisma.deviceAutomation.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Automation deleted",
    });
  } catch (error) {
    console.error("Delete automation error:", error);

    return res.status(500).json({
      message: "Failed to delete automation",
    });
  }
}

function getParamId(value: string | string[] | undefined): string | null {
  if (!value || Array.isArray(value)) {
    return null;
  }

  return value;
}
