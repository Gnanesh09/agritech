import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";
import { log } from "node:console";
import { model } from "mongoose";
import { DeviceStatus } from "../../generated/prisma/enums";

import { normalizeCapabilities } from "../services/deviceCapabilities.service";

import * as crypto from "node:crypto";

// ============================================================
// RACK MODEL HELPERS
// ============================================================

function validateRackLayout(
  kind: unknown,
  rackRowCount: unknown,
  traysPerRow: unknown,
) {
  const resolvedKind = kind ?? "GENERIC";

  if (resolvedKind !== "GENERIC" && resolvedKind !== "RACK") {
    return "kind must be GENERIC or RACK";
  }

  if (resolvedKind === "RACK") {
    if (![3, 4].includes(Number(rackRowCount))) {
      return "RACK rackRowCount must be 3 or 4";
    }

    if (traysPerRow !== undefined && Number(traysPerRow) !== 4) {
      return "RACK traysPerRow must be 4";
    }
  }

  if (
    resolvedKind === "GENERIC" &&
    rackRowCount !== undefined &&
    rackRowCount !== null
  ) {
    return "GENERIC models cannot define rackRowCount";
  }

  return null;
}

function buildRackCapabilities(rowCount: number, capabilities: unknown) {
  const normalized = normalizeCapabilities(capabilities);
  const sensors = [...(normalized.sensors ?? [])];
  const actuators = [...(normalized.actuators ?? [])];

  for (let row = 1; row <= rowCount; row += 1) {
    const requiredSensors = [
      {
        key: `row_${row}_temperature`,
        label: `Row ${row} temperature`,
        type: "number",
        unit: "°C",
      },
      {
        key: `row_${row}_humidity`,
        label: `Row ${row} humidity`,
        type: "number",
        unit: "%",
      },
      {
        key: `row_${row}_light_sensor`,
        label: `Row ${row} light sensor`,
        type: "number",
      },
    ];

    const requiredActuators = [
      { key: `row_${row}_fan`, label: `Row ${row} fan`, type: "boolean" },
      { key: `row_${row}_light`, label: `Row ${row} light`, type: "boolean" },
    ];

    for (const capability of requiredSensors) {
      if (!sensors.some((item: any) => item.key === capability.key)) {
        sensors.push(capability as any);
      }
    }

    for (const capability of requiredActuators) {
      if (!actuators.some((item: any) => item.key === capability.key)) {
        actuators.push(capability as any);
      }
    }
  }

  return { sensors, actuators };
}

export async function createDeviceModel(req: Request, res: Response) {
  try {
    const {
      name,
      code,
      description,
      version,
      imageUrl,
      capabilities,
      kind = "GENERIC",
      rackRowCount,
      traysPerRow = 4,
    } = req.body;

    const rackLayoutError = validateRackLayout(kind, rackRowCount, traysPerRow);

    if (rackLayoutError) {
      return res.status(400).json({ message: rackLayoutError });
    }

    const normalizedCapabilities =
      kind === "RACK"
        ? buildRackCapabilities(Number(rackRowCount), capabilities)
        : normalizeCapabilities(capabilities);
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
        kind,
        rackRowCount: kind === "RACK" ? Number(rackRowCount) : null,
        traysPerRow: kind === "RACK" ? Number(traysPerRow) : 4,

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
        kind: deviceModel.kind,
        rackRowCount: deviceModel.rackRowCount,
        traysPerRow: deviceModel.traysPerRow,

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
        kind: model.kind,
        rackRowCount: model.rackRowCount,
        traysPerRow: model.traysPerRow,
        capabilities: model.capabilities,

        // Number of physical devices registered
        deviceCount: model._count.devices,

        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      })),
    });
  } catch (error) {
    console.error("getAllDeviceModel:", error);
    return res.status(500).json({ message: "Failed to fetch device models" });
  }
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
        kind: deviceModel.kind,
        rackRowCount: deviceModel.rackRowCount,
        traysPerRow: deviceModel.traysPerRow,

        deviceCount: deviceModel._count.devices,
        capabilities: deviceModel.capabilities,
        createdAt: deviceModel.createdAt,
        updatedAt: deviceModel.updatedAt,
      },
    });
  } catch (error) {
    console.error("getDeviceModelById:", error);
    return res.status(500).json({ message: "Failed to fetch device model" });
  }
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

    const {
      name,
      code,
      description,
      version,
      status,
      imageUrl,
      capabilities,
      kind,
      rackRowCount,
      traysPerRow,
    } = req.body;

    const existingModel = await prisma.deviceModel.findUnique({
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

    if (!existingModel) {
      return res.status(404).json({
        message: "Device model not found",
      });
    }

    const nextKind = kind ?? existingModel.kind;
    const nextRackRowCount =
      rackRowCount !== undefined ? rackRowCount : existingModel.rackRowCount;
    const nextTraysPerRow =
      traysPerRow !== undefined ? traysPerRow : existingModel.traysPerRow;

    const rackLayoutError = validateRackLayout(
      nextKind,
      nextRackRowCount,
      nextTraysPerRow,
    );

    if (rackLayoutError) {
      return res.status(400).json({ message: rackLayoutError });
    }

    if (
      existingModel._count.devices > 0 &&
      (kind !== undefined ||
        rackRowCount !== undefined ||
        traysPerRow !== undefined) &&
      (nextKind !== existingModel.kind ||
        Number(nextRackRowCount ?? 0) !==
          Number(existingModel.rackRowCount ?? 0) ||
        Number(nextTraysPerRow) !== Number(existingModel.traysPerRow))
    ) {
      return res.status(409).json({
        message:
          "Rack layout cannot be changed while physical devices are registered under this model",
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

    const shouldRefreshCapabilities =
      capabilities !== undefined ||
      kind !== undefined ||
      rackRowCount !== undefined ||
      traysPerRow !== undefined;

    const nextCapabilities =
      nextKind === "RACK"
        ? buildRackCapabilities(
            Number(nextRackRowCount),
            capabilities !== undefined
              ? capabilities
              : existingModel.capabilities,
          )
        : normalizeCapabilities(
            capabilities !== undefined
              ? capabilities
              : existingModel.capabilities,
          );
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
        ...(shouldRefreshCapabilities && {
          capabilities: nextCapabilities,
        }),
        ...(kind !== undefined && {
          kind,
        }),
        ...(rackRowCount !== undefined && {
          rackRowCount: nextKind === "RACK" ? Number(rackRowCount) : null,
        }),
        ...(traysPerRow !== undefined && {
          traysPerRow: Number(traysPerRow),
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
          kind: device.deviceModel.kind,
          rackRowCount: device.deviceModel.rackRowCount,
          traysPerRow: device.deviceModel.traysPerRow,
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

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    // =========================================================
    // BUILD FILTER
    // =========================================================

    const where: any = {};

    if (status) {
      where.status = String(status);
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

        {
          chipId: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
      ];
    }

    // =========================================================
    // GET DEVICES + COUNT
    // =========================================================

    const [devices, total] = await prisma.$transaction([
      prisma.device.findMany({
        where,

        include: {
          // -----------------------------------------------
          // DEVICE MODEL
          // -----------------------------------------------

          deviceModel: true,

          // -----------------------------------------------
          // USER OWNERSHIP
          //
          // There is no Device.owner anymore.
          // Ownership is through UserDevice.
          // -----------------------------------------------

          userDevices: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
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

    // =========================================================
    // TRANSFORM FOR ADMIN FRONTEND
    // =========================================================

    const formattedDevices = devices.map((device) => {
      /*
       * A physical device can currently have
       * one UserDevice ownership record.
       *
       * We expose the first one as `owner`
       * so your admin frontend doesn't need
       * to know about the database relation.
       */

      const linkedUser = device.userDevices[0]?.user ?? null;

      return {
        id: device.id,

        deviceCode: device.deviceCode,

        serialNumber: device.serialNumber,

        macAddress: device.macAddress,

        chipId: device.chipId,

        status: device.status,

        batchNumber: device.batchNumber,

        manufacturedAt: device.manufacturedAt,

        linkedAt: device.linkedAt,

        createdAt: device.createdAt,

        updatedAt: device.updatedAt,

        // -------------------------------------------
        // MODEL
        // -------------------------------------------

        deviceModel: device.deviceModel,

        // -------------------------------------------
        // OWNER
        // -------------------------------------------

        owner: linkedUser
          ? {
              id: linkedUser.id,

              username: linkedUser.username,

              email: linkedUser.email,
            }
          : null,
      };
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(200).json({
      devices: formattedDevices,

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

    // --------------------------------------------------
    // VALIDATE ID
    // --------------------------------------------------

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }

    // --------------------------------------------------
    // FETCH DEVICE
    // --------------------------------------------------

    const device = await prisma.device.findUnique({
      where: {
        id,
      },

      include: {
        // Device model
        deviceModel: true,

        // Ownership is through UserDevice
        userDevices: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                phoneNo: true,
              },
            },
          },
        },

        // Current dynamic state
        state: true,
      },
    });

    // --------------------------------------------------
    // NOT FOUND
    // --------------------------------------------------

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    // --------------------------------------------------
    // FIND CURRENT USER
    //
    // A physical device is considered linked when
    // its UserDevice relation exists.
    // --------------------------------------------------

    const linkedUser = device.userDevices[0]?.user ?? null;

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      message: "Device fetched successfully",

      device: {
        id: device.id,

        deviceCode: device.deviceCode,

        serialNumber: device.serialNumber,

        macAddress: device.macAddress,

        chipId: device.chipId,

        status: device.status,

        batchNumber: device.batchNumber,

        manufacturedAt: device.manufacturedAt,

        linkedAt: device.linkedAt,

        createdAt: device.createdAt,

        updatedAt: device.updatedAt,

        // ------------------------------------------
        // MODEL
        // ------------------------------------------

        deviceModel: {
          id: device.deviceModel.id,

          name: device.deviceModel.name,

          code: device.deviceModel.code,

          description: device.deviceModel.description,

          version: device.deviceModel.version,

          status: device.deviceModel.status,

          imageUrl: device.deviceModel.imageUrl,

          capabilities: device.deviceModel.capabilities,
        },

        // ------------------------------------------
        // OWNER
        // ------------------------------------------

        owner: linkedUser
          ? {
              id: linkedUser.id,

              username: linkedUser.username,

              email: linkedUser.email,

              phoneNo: linkedUser.phoneNo,
            }
          : null,

        // ------------------------------------------
        // CURRENT STATE
        // ------------------------------------------

        state: device.state
          ? {
              actual: device.state.actual,

              desired: device.state.desired,

              modes: device.state.modes,

              lastReportedAt: device.state.lastReportedAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("getDevice:", error);

    return res.status(500).json({
      message: "Failed to fetch device",
    });
  }
}
/// ======================================================
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

    // --------------------------------------------------
    // CHECK DEVICE
    // --------------------------------------------------

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

    // --------------------------------------------------
    // CHECK DEVICE MODEL
    // --------------------------------------------------

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

    // --------------------------------------------------
    // DUPLICATE PROTECTION
    // --------------------------------------------------

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
              ...(deviceCode
                ? [
                    {
                      deviceCode,
                    },
                  ]
                : []),

              ...(serialNumber
                ? [
                    {
                      serialNumber,
                    },
                  ]
                : []),

              ...(macAddress
                ? [
                    {
                      macAddress,
                    },
                  ]
                : []),

              ...(chipId
                ? [
                    {
                      chipId,
                    },
                  ]
                : []),
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

    // --------------------------------------------------
    // UPDATE
    // --------------------------------------------------

    const updatedDevice = await prisma.device.update({
      where: {
        id,
      },

      data: {
        ...(deviceCode !== undefined && {
          deviceCode: deviceCode.trim(),
        }),

        ...(serialNumber !== undefined && {
          serialNumber: serialNumber.trim(),
        }),

        ...(macAddress !== undefined && {
          macAddress: macAddress?.trim() || null,
        }),

        ...(chipId !== undefined && {
          chipId: chipId?.trim() || null,
        }),

        ...(deviceModelId !== undefined && {
          deviceModelId,
        }),

        ...(batchNumber !== undefined && {
          batchNumber: batchNumber?.trim() || null,
        }),

        ...(manufacturedAt !== undefined && {
          manufacturedAt: manufacturedAt ? new Date(manufacturedAt) : null,
        }),
      },

      // IMPORTANT:
      // Device no longer has an `owner` relation.
      // Ownership is through UserDevice.
      include: {
        deviceModel: true,

        userDevices: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                phoneNo: true,
              },
            },
          },
        },

        state: true,
      },
    });

    // --------------------------------------------------
    // CURRENT LINKED USER
    // --------------------------------------------------

    const linkedUser = updatedDevice.userDevices[0]?.user ?? null;

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      message: "Device updated successfully",

      device: {
        id: updatedDevice.id,

        deviceCode: updatedDevice.deviceCode,

        serialNumber: updatedDevice.serialNumber,

        macAddress: updatedDevice.macAddress,

        chipId: updatedDevice.chipId,

        status: updatedDevice.status,

        batchNumber: updatedDevice.batchNumber,

        manufacturedAt: updatedDevice.manufacturedAt,

        linkedAt: updatedDevice.linkedAt,

        createdAt: updatedDevice.createdAt,

        updatedAt: updatedDevice.updatedAt,

        deviceModel: updatedDevice.deviceModel,

        owner: linkedUser
          ? {
              id: linkedUser.id,
              username: linkedUser.username,
              email: linkedUser.email,
              phoneNo: linkedUser.phoneNo,
            }
          : null,

        state: updatedDevice.state
          ? {
              actual: updatedDevice.state.actual,
              desired: updatedDevice.state.desired,
              modes: updatedDevice.state.modes,
              lastReportedAt: updatedDevice.state.lastReportedAt,
            }
          : null,
      },
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
