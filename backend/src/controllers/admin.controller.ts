import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";
import { log } from "node:console";
import { model } from "mongoose";
import { DeviceStatus } from "../../generated/prisma/enums";

import { normalizeCapabilities } from "../services/deviceCapabilities.service";

import * as crypto from "node:crypto";

export async function createDeviceModel(req: Request, res: Response) {
  try {
    const { name, code, description, version, imageUrl, capabilities } =
      req.body;

    const normalizedCapabilities = normalizeCapabilities(capabilities);
    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!name || !code) {
      return res.status(400).json({
        message: "Device model name and code are required",
      });
    }

    // --------------------------------------------------
    // CHECK IF MODEL ALREADY EXISTS
    // --------------------------------------------------

    const existingModel = await prisma.deviceModel.findUnique({
      where: {
        code,
      },
    });

    if (existingModel) {
      return res.status(409).json({
        message: "A device model with this code already exists",
      });
    }

    // --------------------------------------------------
    // CREATE DEVICE MODEL
    // --------------------------------------------------

    const deviceModel = await prisma.deviceModel.create({
      data: {
        name,
        code,
        description: description || null,
        version: version || null,
        imageUrl: imageUrl || null,

        capabilities: normalizedCapabilities,

        status: "ACTIVE",
      },
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(201).json({
      message: "Device model created successfully",

      deviceModel: {
        id: deviceModel.id,

        name: deviceModel.name,

        code: deviceModel.code,

        description: deviceModel.description,

        version: deviceModel.version,

        imageUrl: deviceModel.imageUrl,

        capabilities: deviceModel.capabilities,

        status: deviceModel.status,

        createdAt: deviceModel.createdAt,
      },
    });
  } catch (error) {
    console.error("Create Device Model Error:", error);

    return res.status(500).json({
      message: "Failed to create device model",
    });
  }
}

// get registered devices
export async function getAllDeviceModel(req: AuthRequest, res: Response) {
  try {
    const deviceModels = await prisma.deviceModel.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            devices: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "device models fetched successfully",
      deviceModels: deviceModels.map((model) => ({
        id: model.id,
        name: model.name,
        code: model.code,
        description: model.description,
        version: model.version,
        status: model.status,
        imageUrl: model.imageUrl,

        // Number of physical devices registered
        deviceCount: model._count.devices,

        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      })),
    });
  } catch (error) {}
}

// get models by id

export async function getDeviceModelById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "invalid device model id",
      });
    }

    const deviceModel = await prisma.deviceModel.findUnique({
      where: {
        id: id,
      },
      include: {
        _count: {
          select: {
            devices: true,
          },
        },
      },
    });

    if (!deviceModel) {
      return res.status(400).json({
        message: "device model not found",
      });
    }

    return res.status(200).json({
      message: "device model fetched successfully",
      deviceModel: {
        id: deviceModel.id,
        name: deviceModel.name,
        code: deviceModel.code,
        description: deviceModel.description,
        version: deviceModel.version,
        status: deviceModel.status,
        imageUrl: deviceModel.imageUrl,

        deviceCount: deviceModel._count.devices,

        createdAt: deviceModel.createdAt,
        updatedAt: deviceModel.updatedAt,
      },
    });
  } catch (error) {}
}

// update  device model
export async function updateDeviceModel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device model ID",
      });
    }

    const { name, code, description, version, status, imageUrl, capabilities } =
      req.body;

    const normalizedCapabilities = normalizeCapabilities(capabilities);

    const existingModel = await prisma.deviceModel.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingModel) {
      return res.status(404).json({
        message: "Device model not found",
      });
    }

    // Check duplicate code
    if (code !== undefined && code !== existingModel.code) {
      const codeExists = await prisma.deviceModel.findUnique({
        where: {
          code,
        },
      });

      if (codeExists) {
        return res.status(409).json({
          message: "A device model with this code already exists",
        });
      }
    }

    const updatedModel = await prisma.deviceModel.update({
      where: {
        id: id,
      },

      data: {
        ...(name !== undefined && {
          name,
        }),

        ...(code !== undefined && {
          code,
        }),

        ...(description !== undefined && {
          description,
        }),

        ...(version !== undefined && {
          version,
        }),

        ...(status !== undefined && {
          status,
        }),
        ...(imageUrl !== undefined && {
          imageUrl,
        }),
        ...(capabilities !== undefined && {
          capabilities,
        }),
      },
    });

    return res.status(200).json({
      message: "Device model updated successfully",

      deviceModel: updatedModel,
    });
  } catch (error) {
    console.error("Update Device Model Error:", error);

    return res.status(500).json({
      message: "Failed to update device model",
    });
  }
}

// delete device model
export async function deleteDeviceModel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device model ID",
      });
    }

    const deviceModel = await prisma.deviceModel.findUnique({
      where: {
        id: id,
      },

      include: {
        _count: {
          select: {
            devices: true,
          },
        },
      },
    });

    if (!deviceModel) {
      return res.status(404).json({
        message: "Device model not found",
      });
    }

    if (deviceModel._count.devices > 0) {
      return res.status(409).json({
        message:
          "Cannot delete device model because physical devices are registered under it",
        deviceCount: deviceModel._count.devices,
      });
    }

    await prisma.deviceModel.delete({
      where: {
        id: id,
      },
    });

    return res.status(200).json({
      message: "Device model deleted successfully",
    });
  } catch (error) {
    console.error("Delete Device Model Error:", error);

    return res.status(500).json({
      message: "Failed to delete device model",
    });
  }
}

// ============================================================
// REGISTER A NEW PHYSICAL DEVICE
// ADMIN / SUPER_ADMIN ONLY
// ============================================================
export async function registerDevice(req: Request, res: Response) {
  try {
    const {
      deviceCode,
      serialNumber,
      macAddress,
      chipId,
      deviceModelId,
      batchNumber,
      manufacturedAt,
    } = req.body;

    // --------------------------------------------------
    // 1. Validate required fields
    // --------------------------------------------------

    if (!deviceCode || !serialNumber || !deviceModelId) {
      return res.status(400).json({
        message: "deviceCode, serialNumber and deviceModelId are required",
      });
    }

    // --------------------------------------------------
    // 2. Check whether device already exists
    // --------------------------------------------------

    const existingDevice = await prisma.device.findFirst({
      where: {
        OR: [
          { deviceCode },
          { serialNumber },

          ...(macAddress ? [{ macAddress }] : []),

          ...(chipId ? [{ chipId }] : []),
        ],
      },
    });

    if (existingDevice) {
      return res.status(409).json({
        message: "Device already exists",

        device: {
          id: existingDevice.id,

          deviceCode: existingDevice.deviceCode,

          serialNumber: existingDevice.serialNumber,

          status: existingDevice.status,
        },
      });
    }

    // --------------------------------------------------
    // 3. Check DeviceModel
    // --------------------------------------------------

    const deviceModel = await prisma.deviceModel.findUnique({
      where: {
        id: deviceModelId,
      },
    });

    if (!deviceModel) {
      return res.status(404).json({
        message: "Device model not found",
      });
    }

    // --------------------------------------------------
    // 4. Model must be ACTIVE
    // --------------------------------------------------

    if (deviceModel.status !== "ACTIVE") {
      return res.status(400).json({
        message: "Device model is not active",
      });
    }

    // --------------------------------------------------
    // 5. Generate device token
    // --------------------------------------------------

    const deviceToken = crypto.randomBytes(32).toString("hex");

    // --------------------------------------------------
    // 6. Hash token before storing
    // --------------------------------------------------

    const tokenHash = crypto
      .createHash("sha256")
      .update(deviceToken)
      .digest("hex");

    // --------------------------------------------------
    // 7. Create Device + Credential
    // --------------------------------------------------

    const device = await prisma.$transaction(async (tx) => {
      const newDevice = await tx.device.create({
        data: {
          deviceCode,

          serialNumber,

          macAddress: macAddress || null,

          chipId: chipId || null,

          deviceModelId,

          // Device is inventory only.
          // No user assigned yet.
          status: "AVAILABLE",

          batchNumber: batchNumber || null,

          manufacturedAt: manufacturedAt ? new Date(manufacturedAt) : null,

          linkedAt: null,
        },

        include: {
          deviceModel: true,
        },
      });

      // ------------------------------------------
      // Create device credential
      // ------------------------------------------

      await tx.deviceCredential.create({
        data: {
          deviceId: newDevice.id,

          tokenHash,
        },
      });
      await tx.deviceState.create({
        data: {
          deviceId: newDevice.id,
          actual: {},
          desired: {},
          modes: {},
        },
      });

      return newDevice;
    });

    // --------------------------------------------------
    // 8. Return device
    // --------------------------------------------------

    return res.status(201).json({
      message: "Device registered successfully",

      device: {
        id: device.id,

        deviceCode: device.deviceCode,

        serialNumber: device.serialNumber,

        macAddress: device.macAddress,

        chipId: device.chipId,

        status: device.status,

        deviceModel: {
          id: device.deviceModel.id,

          name: device.deviceModel.name,

          code: device.deviceModel.code,
        },

        batchNumber: device.batchNumber,

        manufacturedAt: device.manufacturedAt,

        createdAt: device.createdAt,
      },

      // IMPORTANT:
      // Raw secret is returned only once.
      deviceToken,
    });
  } catch (error) {
    console.error("Register Device Error:", error);

    return res.status(500).json({
      message: "Failed to register device",
    });
  }
}

export async function getAllDevices(req: Request, res: Response) {
  try {
    const {
      status,
      deviceModelId,
      search,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    // -----------------------------
    // Build filters
    // -----------------------------

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (deviceModelId) {
      where.deviceModelId = String(deviceModelId);
    }

    if (search) {
      const searchValue = String(search);

      where.OR = [
        {
          deviceCode: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
        {
          serialNumber: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
        {
          macAddress: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
      ];
    }

    // -----------------------------
    // Fetch devices + count
    // -----------------------------

    const [devices, total] = await prisma.$transaction([
      prisma.device.findMany({
        where,

        include: {
          deviceModel: true,
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        skip,
        take: limitNumber,
      }),

      prisma.device.count({
        where,
      }),
    ]);

    return res.status(200).json({
      devices,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("getAllDevices:", error);

    return res.status(500).json({
      message: "Failed to fetch devices",
    });
  }
}

export async function getDevice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }
    const device = await prisma.device.findUnique({
      where: {
        id,
      },

      include: {
        deviceModel: true,

        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            phoneNo: true,
          },
        },
      },
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    return res.status(200).json({
      device,
    });
  } catch (error) {
    console.error("getDevice:", error);

    return res.status(500).json({
      message: "Failed to fetch device",
    });
  }
}

// ======================================================
// UPDATE DEVICE
// PATCH /api/admin/devices/:id
// ======================================================

export async function updateDevice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }

    const {
      deviceCode,
      serialNumber,
      macAddress,
      chipId,
      deviceModelId,
      batchNumber,
      manufacturedAt,
    } = req.body;

    // -----------------------------
    // Check device
    // -----------------------------

    const existingDevice = await prisma.device.findUnique({
      where: {
        id,
      },
    });

    if (!existingDevice) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    // -----------------------------
    // Check Device Model
    // -----------------------------

    if (deviceModelId) {
      const model = await prisma.deviceModel.findUnique({
        where: {
          id: deviceModelId,
        },
      });

      if (!model) {
        return res.status(404).json({
          message: "Device model not found",
        });
      }

      if (model.status !== "ACTIVE") {
        return res.status(400).json({
          message: "Device model is not active",
        });
      }
    }

    // -----------------------------
    // Duplicate protection
    // -----------------------------

    const duplicate = await prisma.device.findFirst({
      where: {
        AND: [
          {
            id: {
              not: id,
            },
          },

          {
            OR: [
              ...(deviceCode ? [{ deviceCode }] : []),

              ...(serialNumber ? [{ serialNumber }] : []),

              ...(macAddress ? [{ macAddress }] : []),

              ...(chipId ? [{ chipId }] : []),
            ],
          },
        ],
      },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Another device already uses one of these identifiers",
      });
    }

    // -----------------------------
    // Update
    // -----------------------------

    const updatedDevice = await prisma.device.update({
      where: {
        id,
      },

      data: {
        ...(deviceCode !== undefined && {
          deviceCode,
        }),

        ...(serialNumber !== undefined && {
          serialNumber,
        }),

        ...(macAddress !== undefined && {
          macAddress: macAddress || null,
        }),

        ...(chipId !== undefined && {
          chipId: chipId || null,
        }),

        ...(deviceModelId !== undefined && {
          deviceModelId,
        }),

        ...(batchNumber !== undefined && {
          batchNumber: batchNumber || null,
        }),

        ...(manufacturedAt !== undefined && {
          manufacturedAt: manufacturedAt ? new Date(manufacturedAt) : null,
        }),
      },

      include: {
        deviceModel: true,
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Device updated successfully",
      device: updatedDevice,
    });
  } catch (error) {
    console.error("updateDevice:", error);

    return res.status(500).json({
      message: "Failed to update device",
    });
  }
}

// ======================================================
// UPDATE DEVICE STATUS
// PATCH /api/admin/devices/:id/status
// ======================================================

export async function updateDeviceStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }

    const { status } = req.body;

    // -----------------------------
    // Validate status
    // -----------------------------

    const validStatuses = [
      DeviceStatus.AVAILABLE,
      DeviceStatus.LINKED,
      DeviceStatus.BLOCKED,
      DeviceStatus.RETIRED,
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid device status",
        allowedStatuses: validStatuses,
      });
    }

    // -----------------------------
    // Find device
    // -----------------------------

    const device = await prisma.device.findUnique({
      where: {
        id,
      },
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    // -----------------------------
    // Prevent invalid lifecycle changes
    // -----------------------------

    if (
      device.status === DeviceStatus.RETIRED &&
      status !== DeviceStatus.RETIRED
    ) {
      return res.status(400).json({
        message: "A retired device cannot be reactivated",
      });
    }

    // -----------------------------
    // Update status
    // -----------------------------

    const updatedDevice = await prisma.device.update({
      where: {
        id,
      },

      data: {
        status,
      },
    });

    return res.status(200).json({
      message: "Device status updated successfully",

      device: updatedDevice,
    });
  } catch (error) {
    console.error("updateDeviceStatus:", error);

    return res.status(500).json({
      message: "Failed to update device status",
    });
  }
}

// ======================================================
// DELETE DEVICE
// DELETE /api/admin/devices/:id
// ======================================================

export async function deleteDevice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }
    // -----------------------------
    // Find device
    // -----------------------------

    const device = await prisma.device.findUnique({
      where: {
        id,
      },
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    // -----------------------------
    // Don't delete linked devices
    // -----------------------------

    if (device.status === DeviceStatus.LINKED) {
      return res.status(400).json({
        message:
          "Linked devices cannot be deleted. Unlink or retire the device first.",
      });
    }

    // -----------------------------
    // Delete
    // -----------------------------

    await prisma.device.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Device deleted successfully",
    });
  } catch (error) {
    console.error("deleteDevice:", error);

    return res.status(500).json({
      message: "Failed to delete device",
    });
  }
}

// ======================================================
// DEVICE STATISTICS
// GET /api/admin/devices/stats
// ======================================================

export async function getDeviceStats(req: Request, res: Response) {
  try {
    const [total, available, linked, blocked, retired] =
      await prisma.$transaction([
        prisma.device.count(),

        prisma.device.count({
          where: {
            status: DeviceStatus.AVAILABLE,
          },
        }),

        prisma.device.count({
          where: {
            status: DeviceStatus.LINKED,
          },
        }),

        prisma.device.count({
          where: {
            status: DeviceStatus.BLOCKED,
          },
        }),

        prisma.device.count({
          where: {
            status: DeviceStatus.RETIRED,
          },
        }),
      ]);

    return res.status(200).json({
      total,
      available,
      linked,
      blocked,
      retired,
    });
  } catch (error) {
    console.error("getDeviceStats:", error);

    return res.status(500).json({
      message: "Failed to fetch device statistics",
    });
  }
}
