import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";

// ======================================================
// GET MY PROFILE
// GET /api/user/profile
// ======================================================

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        countryCode: true,
        phoneNo: true,
        role: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("getProfile:", error);

    return res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
}

// ======================================================
// UPDATE MY PROFILE
// PATCH /api/user/profile
// ======================================================

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { username, countryCode, phoneNo } = req.body;

    // -----------------------------
    // Check username
    // -----------------------------

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: {
            id: req.userId,
          },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "Username already exists",
        });
      }
    }

    // -----------------------------
    // Update
    // -----------------------------

    const user = await prisma.user.update({
      where: {
        id: req.userId,
      },

      data: {
        ...(username !== undefined && {
          username,
        }),

        ...(countryCode !== undefined && {
          countryCode,
        }),

        ...(phoneNo !== undefined && {
          phoneNo,
        }),
      },

      select: {
        id: true,
        username: true,
        email: true,
        countryCode: true,
        phoneNo: true,
        role: true,
        verified: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("updateProfile:", error);

    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
}

// ======================================================
// RACK HELPERS
// ======================================================

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function publicRack(rack: any) {
  const now = new Date();

  return {
    id: rack.id,
    deviceId: rack.deviceId,
    name: rack.name,
    rowCount: rack.rowCount,
    traysPerRow: rack.traysPerRow,
    status: rack.status,
    createdAt: rack.createdAt,
    updatedAt: rack.updatedAt,
    rows: rack.rows?.map((row: any) => ({
      id: row.id,
      rowNumber: row.rowNumber,
      name: row.name,
      fanTarget: row.fanTarget,
      lightTarget: row.lightTarget,
      temperatureSensorKey: row.temperatureSensorKey,
      humiditySensorKey: row.humiditySensorKey,
      lightSensorKey: row.lightSensorKey,
      controlConfig: row.controlConfig,
      trays: row.trays?.map((tray: any) => ({
        id: tray.id,
        slot: tray.slot,
        name: tray.name,
        currentCrop: (() => {
          const cycle = tray.cycles?.[0];
          if (!cycle) return null;
          const status =
            cycle.status === "GROWING" &&
            new Date(cycle.expectedHarvestDate) <= now
              ? "READY"
              : cycle.status;
          return { ...cycle, status };
        })(),
      })),
    })),
  };
}

async function getOwnedRack(userId: string, rackId: string) {
  return prisma.rack.findFirst({
    where: {
      id: rackId,
      userId,
      status: "ACTIVE",
    },
    include: {
      rows: {
        orderBy: { rowNumber: "asc" },
        include: {
          trays: {
            orderBy: { slot: "asc" },
            include: {
              cycles: {
                where: {
                  status: { in: ["GROWING", "READY"] },
                },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
      device: {
        include: {
          deviceModel: true,
          state: true,
        },
      },
    },
  });
}

// ======================================================
// GET MY DEVICES
// GET /api/user/devices
// ======================================================
export async function getMyDevices(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userDevices = await prisma.userDevice.findMany({
      where: { userId: req.userId },
      include: {
        device: {
          include: {
            deviceModel: true,
            state: true,
            racks: {
              where: { status: "ACTIVE", userId: req.userId },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                rows: {
                  orderBy: { rowNumber: "asc" },
                  include: {
                    trays: {
                      orderBy: { slot: "asc" },
                      include: {
                        cycles: {
                          where: { status: { in: ["GROWING", "READY"] } },
                          orderBy: { createdAt: "desc" },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      devices: userDevices.map((item: any) => {
        const rack = item.device.racks?.[0] ?? null;

        return {
          id: item.device.id,
          deviceCode: item.device.deviceCode,
          serialNumber: item.device.serialNumber,
          status: item.device.status,
          linkedAt: item.device.linkedAt,
          lastSeenAt: item.device.lastSeenAt,
          firmwareVersion: item.device.firmwareVersion,
          name: item.name,
          deviceModel: {
            id: item.device.deviceModel.id,
            name: item.device.deviceModel.name,
            code: item.device.deviceModel.code,
            imageUrl: item.device.deviceModel.imageUrl,
            capabilities: item.device.deviceModel.capabilities,
            kind: item.device.deviceModel.kind,
            rackRowCount: item.device.deviceModel.rackRowCount,
            traysPerRow: item.device.deviceModel.traysPerRow,
          },
          state: item.device.state
            ? {
                actual: item.device.state.actual,
                desired: item.device.state.desired,
                modes: item.device.state.modes,
                lastReportedAt: item.device.state.lastReportedAt,
              }
            : null,
          rack: rack ? publicRack(rack) : null,
        };
      }),
    });
  } catch (error) {
    console.error("getMyDevices:", error);
    return res.status(500).json({ message: "Failed to fetch your devices" });
  }
}

// ======================================================
// GET MY SINGLE DEVICE
// GET /api/user/devices/:id
// ======================================================
export async function getMyDevice(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Invalid device ID" });
    }

    const item = await prisma.userDevice.findFirst({
      where: { userId: req.userId, deviceId: id },
      include: {
        device: {
          include: {
            deviceModel: true,
            state: true,
            racks: {
              where: { status: "ACTIVE", userId: req.userId },
              take: 1,
              orderBy: { createdAt: "desc" },
              include: {
                rows: {
                  orderBy: { rowNumber: "asc" },
                  include: {
                    trays: {
                      orderBy: { slot: "asc" },
                      include: {
                        cycles: {
                          where: { status: { in: ["GROWING", "READY"] } },
                          orderBy: { createdAt: "desc" },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      return res
        .status(404)
        .json({ message: "Device not found or does not belong to you" });
    }

    const rack = item.device.racks?.[0] ?? null;

    return res.status(200).json({
      device: {
        id: item.device.id,
        deviceCode: item.device.deviceCode,
        serialNumber: item.device.serialNumber,
        status: item.device.status,
        linkedAt: item.device.linkedAt,
        lastSeenAt: item.device.lastSeenAt,
        firmwareVersion: item.device.firmwareVersion,
        name: item.name,
        deviceModel: item.device.deviceModel,
        state: item.device.state,
        rack: rack ? publicRack(rack) : null,
      },
    });
  } catch (error) {
    console.error("getMyDevice:", error);
    return res.status(500).json({ message: "Failed to fetch device" });
  }
}

// ======================================================
// CLAIM DEVICE
// POST /api/user/devices/claim
// ======================================================
export async function claimDevice(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { deviceCode, serialNumber } = req.body;

    if (!deviceCode && !serialNumber) {
      return res
        .status(400)
        .json({ message: "deviceCode or serialNumber is required" });
    }

    const device = await prisma.device.findFirst({
      where: {
        status: "AVAILABLE",
        OR: [
          ...(deviceCode ? [{ deviceCode }] : []),
          ...(serialNumber ? [{ serialNumber }] : []),
        ],
      },
      include: { deviceModel: true },
    });

    if (!device) {
      return res.status(404).json({ message: "Available device not found" });
    }

    const existingUserDevice = await prisma.userDevice.findUnique({
      where: {
        userId_deviceId: { userId: req.userId, deviceId: device.id },
      },
    });

    if (existingUserDevice) {
      return res
        .status(409)
        .json({ message: "Device is already linked to your account" });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.device.update({
        where: { id: device.id },
        data: { status: "LINKED", linkedAt: new Date() },
      });

      const relation = await tx.userDevice.create({
        data: { userId: req.userId!, deviceId: device.id, name: null },
      });

      let rackId: string | null = null;

      if (device.deviceModel.kind === "RACK") {
        const rowCount = Number(device.deviceModel.rackRowCount);
        const traysPerRow = Number(device.deviceModel.traysPerRow || 4);

        if (![3, 4].includes(rowCount) || traysPerRow !== 4) {
          throw new Error("Invalid rack device model layout");
        }

        const rack = await tx.rack.create({
          data: {
            userId: req.userId!,
            deviceId: device.id,
            name: device.deviceModel.name,
            rowCount,
            traysPerRow,
            status: "ACTIVE",
            rows: {
              create: Array.from({ length: rowCount }, (_, rowIndex) => {
                const rowNumber = rowIndex + 1;
                return {
                  rowNumber,
                  name: `Row ${rowNumber}`,
                  fanTarget: `row_${rowNumber}_fan`,
                  lightTarget: `row_${rowNumber}_light`,
                  temperatureSensorKey: `row_${rowNumber}_temperature`,
                  humiditySensorKey: `row_${rowNumber}_humidity`,
                  lightSensorKey: `row_${rowNumber}_light_sensor`,
                  controlConfig: {},
                  trays: {
                    create: Array.from(
                      { length: traysPerRow },
                      (_, slotIndex) => ({
                        slot: slotIndex + 1,
                        name: `Tray ${slotIndex + 1}`,
                      }),
                    ),
                  },
                };
              }),
            },
          },
        });

        rackId = rack.id;
      }

      return { relation, rackId };
    });

    return res.status(200).json({
      message: "Device linked successfully",
      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        serialNumber: device.serialNumber,
        status: "LINKED",
        linkedAt: new Date(),
        name: null,
        deviceModel: {
          id: device.deviceModel.id,
          name: device.deviceModel.name,
          code: device.deviceModel.code,
          kind: device.deviceModel.kind,
          rackRowCount: device.deviceModel.rackRowCount,
          traysPerRow: device.deviceModel.traysPerRow,
        },
        rackId: result.rackId,
      },
    });
  } catch (error) {
    console.error("claimDevice:", error);
    return res.status(500).json({ message: "Failed to claim device" });
  }
}

// ======================================================
// UNLINK DEVICE
// DELETE /api/user/devices/:id
// ======================================================
export async function unlinkDevice(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Invalid device ID" });
    }

    const userDevice = await prisma.userDevice.findFirst({
      where: { userId: req.userId, deviceId: id },
    });

    if (!userDevice) {
      return res
        .status(404)
        .json({ message: "Device not found or does not belong to you" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rack.updateMany({
        where: { userId: req.userId!, deviceId: id, status: "ACTIVE" },
        data: { status: "ARCHIVED" },
      });

      await tx.userDevice.delete({ where: { id: userDevice.id } });

      await tx.device.update({
        where: { id },
        data: { status: "AVAILABLE", linkedAt: null },
      });
    });

    return res
      .status(200)
      .json({ message: "Device disconnected successfully" });
  } catch (error) {
    console.error("unlinkDevice:", error);
    return res.status(500).json({ message: "Failed to disconnect device" });
  }
}

// ======================================================
// RACKS
// ======================================================

export async function getMyRacks(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const racks = await prisma.rack.findMany({
      where: { userId: req.userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        rows: {
          orderBy: { rowNumber: "asc" },
          include: {
            trays: {
              orderBy: { slot: "asc" },
              include: {
                cycles: {
                  where: { status: { in: ["GROWING", "READY"] } },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    return res.status(200).json({ racks: racks.map(publicRack) });
  } catch (error) {
    console.error("getMyRacks:", error);
    return res.status(500).json({ message: "Failed to fetch racks" });
  }
}

export async function getMyRack(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const { rackId } = req.params;
    if (!rackId || Array.isArray(rackId))
      return res.status(400).json({ message: "Invalid rack ID" });

    const rack = await getOwnedRack(req.userId, rackId);
    if (!rack) return res.status(404).json({ message: "Rack not found" });

    return res.status(200).json({
      rack: publicRack(rack),
      device: {
        id: rack.device.id,
        deviceCode: rack.device.deviceCode,
        serialNumber: rack.device.serialNumber,
        status: rack.device.status,
        lastSeenAt: rack.device.lastSeenAt,
        firmwareVersion: rack.device.firmwareVersion,
        deviceModel: rack.device.deviceModel,
        state: rack.device.state,
      },
    });
  } catch (error) {
    console.error("getMyRack:", error);
    return res.status(500).json({ message: "Failed to fetch rack" });
  }
}

export async function renameRack(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const { rackId } = req.params;
    const { name } = req.body;

    if (!rackId || Array.isArray(rackId))
      return res.status(400).json({ message: "Invalid rack ID" });
    if (typeof name !== "string" || !name.trim())
      return res.status(400).json({ message: "Rack name is required" });

    const cleanName = name.trim();
    if (cleanName.length > 50)
      return res
        .status(400)
        .json({ message: "Rack name cannot exceed 50 characters" });

    const rack = await prisma.rack.findFirst({
      where: { id: rackId, userId: req.userId, status: "ACTIVE" },
    });
    if (!rack) return res.status(404).json({ message: "Rack not found" });

    const updated = await prisma.rack.update({
      where: { id: rack.id },
      data: { name: cleanName },
    });
    return res
      .status(200)
      .json({ message: "Rack name updated successfully", rack: updated });
  } catch (error) {
    console.error("renameRack:", error);
    return res.status(500).json({ message: "Failed to update rack name" });
  }
}

export async function updateRackRow(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const { rackId, rowId } = req.params;
    const { name, controlConfig } = req.body;

    if (!rackId || Array.isArray(rackId) || !rowId || Array.isArray(rowId)) {
      return res.status(400).json({ message: "Invalid rack or row ID" });
    }

    const rack = await getOwnedRack(req.userId, rackId);
    if (!rack || !rack.rows.some((row: any) => row.id === rowId)) {
      return res.status(404).json({ message: "Rack row not found" });
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res
        .status(400)
        .json({ message: "Row name must be a non-empty string" });
    }

    const updated = await prisma.rackRow.update({
      where: { id: rowId },
      data: {
        ...(name !== undefined ? { name: name.trim().slice(0, 50) } : {}),
        ...(controlConfig !== undefined
          ? { controlConfig: controlConfig as any }
          : {}),
      },
    });

    return res
      .status(200)
      .json({ message: "Rack row updated successfully", row: updated });
  } catch (error) {
    console.error("updateRackRow:", error);
    return res.status(500).json({ message: "Failed to update rack row" });
  }
}

export async function getTrayCropCycles(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });

    const { rackId, trayId } = req.params;
    if (!rackId || Array.isArray(rackId) || !trayId || Array.isArray(trayId)) {
      return res.status(400).json({ message: "Invalid rack or tray ID" });
    }

    const rack = await getOwnedRack(req.userId, rackId);
    const tray = rack?.rows
      .flatMap((row: any) => row.trays)
      .find((item: any) => item.id === trayId);
    if (!rack || !tray)
      return res.status(404).json({ message: "Tray not found" });

    const cycles = await prisma.trayCropCycle.findMany({
      where: { trayId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      tray: { id: tray.id, slot: tray.slot, name: tray.name },
      cycles,
    });
  } catch (error) {
    console.error("getTrayCropCycles:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch tray crop history" });
  }
}

export async function updateRackTray(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const { rackId, trayId } = req.params;
    const { name } = req.body;

    if (!rackId || Array.isArray(rackId) || !trayId || Array.isArray(trayId)) {
      return res.status(400).json({ message: "Invalid rack or tray ID" });
    }
    if (typeof name !== "string" || !name.trim())
      return res.status(400).json({ message: "Tray name is required" });

    const rack = await getOwnedRack(req.userId, rackId);
    const trayBelongs = rack?.rows.some((row: any) =>
      row.trays.some((tray: any) => tray.id === trayId),
    );
    if (!rack || !trayBelongs)
      return res.status(404).json({ message: "Tray not found" });

    const updated = await prisma.rackTray.update({
      where: { id: trayId },
      data: { name: name.trim().slice(0, 50) },
    });
    return res
      .status(200)
      .json({ message: "Tray updated successfully", tray: updated });
  } catch (error) {
    console.error("updateRackTray:", error);
    return res.status(500).json({ message: "Failed to update tray" });
  }
}

export async function plantTrayCrop(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const { rackId, trayId } = req.params;
    const { cropName, sowingDate, estimatedGrowthDays, notes } = req.body;

    if (!rackId || Array.isArray(rackId) || !trayId || Array.isArray(trayId)) {
      return res.status(400).json({ message: "Invalid rack or tray ID" });
    }
    if (typeof cropName !== "string" || !cropName.trim())
      return res.status(400).json({ message: "cropName is required" });
    if (
      typeof sowingDate !== "string" ||
      Number.isNaN(new Date(sowingDate).getTime())
    )
      return res.status(400).json({ message: "Valid sowingDate is required" });

    const growthDays = Number(estimatedGrowthDays);
    if (!Number.isInteger(growthDays) || growthDays <= 0 || growthDays > 365) {
      return res.status(400).json({
        message: "estimatedGrowthDays must be a positive integer up to 365",
      });
    }

    const rack = await getOwnedRack(req.userId, rackId);
    const tray = rack?.rows
      .flatMap((row: any) => row.trays)
      .find((item: any) => item.id === trayId);
    if (!rack || !tray)
      return res.status(404).json({ message: "Tray not found" });

    const activeCycle = await prisma.trayCropCycle.findFirst({
      where: { trayId, status: { in: ["GROWING", "READY"] } },
    });
    if (activeCycle)
      return res
        .status(409)
        .json({ message: "This tray already has an active crop" });

    const sowDate = new Date(sowingDate);
    const expectedHarvestDate = addDays(sowDate, growthDays);

    const cycle = await prisma.trayCropCycle.create({
      data: {
        trayId,
        cropName: cropName.trim().slice(0, 100),
        sowingDate: sowDate,
        estimatedGrowthDays: growthDays,
        expectedHarvestDate,
        status: expectedHarvestDate <= new Date() ? "READY" : "GROWING",
        notes:
          typeof notes === "string" && notes.trim()
            ? notes.trim().slice(0, 500)
            : null,
      },
    });

    return res
      .status(201)
      .json({ message: "Crop added to tray", cropCycle: cycle });
  } catch (error) {
    console.error("plantTrayCrop:", error);
    return res.status(500).json({ message: "Failed to add crop to tray" });
  }
}

export async function updateCropCycle(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const { id } = req.params;
    const { cropName, sowingDate, estimatedGrowthDays, notes } = req.body;
    if (!id || Array.isArray(id))
      return res.status(400).json({ message: "Invalid crop cycle ID" });

    const cycle = await prisma.trayCropCycle.findFirst({
      where: { id },
      include: { tray: { include: { row: { include: { rack: true } } } } },
    });
    if (
      !cycle ||
      cycle.tray.row.rack.userId !== req.userId ||
      cycle.tray.row.rack.status !== "ACTIVE"
    ) {
      return res.status(404).json({ message: "Crop cycle not found" });
    }
    if (cycle.status === "HARVESTED" || cycle.status === "CANCELLED")
      return res
        .status(400)
        .json({ message: "Completed crop cycles cannot be edited" });

    const nextName =
      cropName !== undefined ? String(cropName).trim() : cycle.cropName;
    const nextSowing =
      sowingDate !== undefined ? new Date(sowingDate) : cycle.sowingDate;
    const nextGrowth =
      estimatedGrowthDays !== undefined
        ? Number(estimatedGrowthDays)
        : cycle.estimatedGrowthDays;

    if (!nextName)
      return res.status(400).json({ message: "cropName cannot be empty" });
    if (Number.isNaN(nextSowing.getTime()))
      return res.status(400).json({ message: "Invalid sowingDate" });
    if (!Number.isInteger(nextGrowth) || nextGrowth <= 0 || nextGrowth > 365)
      return res.status(400).json({
        message: "estimatedGrowthDays must be a positive integer up to 365",
      });

    const expectedHarvestDate = addDays(nextSowing, nextGrowth);

    const updated = await prisma.trayCropCycle.update({
      where: { id },
      data: {
        cropName: nextName.slice(0, 100),
        sowingDate: nextSowing,
        estimatedGrowthDays: nextGrowth,
        expectedHarvestDate,
        status: expectedHarvestDate <= new Date() ? "READY" : "GROWING",
        ...(notes !== undefined
          ? {
              notes:
                typeof notes === "string" ? notes.trim().slice(0, 500) : null,
            }
          : {}),
      },
    });

    return res
      .status(200)
      .json({ message: "Crop cycle updated successfully", cropCycle: updated });
  } catch (error) {
    console.error("updateCropCycle:", error);
    return res.status(500).json({ message: "Failed to update crop cycle" });
  }
}

export async function harvestCropCycle(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const { id } = req.params;
    if (!id || Array.isArray(id))
      return res.status(400).json({ message: "Invalid crop cycle ID" });

    const cycle = await prisma.trayCropCycle.findFirst({
      where: { id },
      include: { tray: { include: { row: { include: { rack: true } } } } },
    });
    if (
      !cycle ||
      cycle.tray.row.rack.userId !== req.userId ||
      cycle.tray.row.rack.status !== "ACTIVE"
    )
      return res.status(404).json({ message: "Crop cycle not found" });
    if (!["GROWING", "READY"].includes(cycle.status))
      return res.status(400).json({ message: "Crop cycle is not harvestable" });

    const updated = await prisma.trayCropCycle.update({
      where: { id },
      data: { status: "HARVESTED", harvestedAt: new Date() },
    });

    return res
      .status(200)
      .json({ message: "Crop harvested successfully", cropCycle: updated });
  } catch (error) {
    console.error("harvestCropCycle:", error);
    return res.status(500).json({ message: "Failed to harvest crop" });
  }
}

export async function cancelCropCycle(req: AuthRequest, res: Response) {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Authentication required" });
    const { id } = req.params;
    if (!id || Array.isArray(id))
      return res.status(400).json({ message: "Invalid crop cycle ID" });

    const cycle = await prisma.trayCropCycle.findFirst({
      where: { id },
      include: { tray: { include: { row: { include: { rack: true } } } } },
    });
    if (
      !cycle ||
      cycle.tray.row.rack.userId !== req.userId ||
      cycle.tray.row.rack.status !== "ACTIVE"
    )
      return res.status(404).json({ message: "Crop cycle not found" });
    if (!["GROWING", "READY"].includes(cycle.status))
      return res
        .status(400)
        .json({ message: "Crop cycle cannot be cancelled" });

    const updated = await prisma.trayCropCycle.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return res
      .status(200)
      .json({ message: "Crop cycle cancelled", cropCycle: updated });
  } catch (error) {
    console.error("cancelCropCycle:", error);
    return res.status(500).json({ message: "Failed to cancel crop cycle" });
  }
}

export async function getMyDeviceTelemetry(req: AuthRequest, res: Response) {
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

    // ---------------------------------------------
    // Check USER owns/has linked this device
    // ---------------------------------------------

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

    // ---------------------------------------------
    // Get telemetry
    // ---------------------------------------------

    const telemetry = await prisma.deviceTelemetry.findMany({
      where: {
        deviceId: id,
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 50,
    });

    return res.status(200).json({
      deviceId: id,
      telemetry: telemetry.map((item) => ({
        id: item.id,

        data: item.data,

        recordedAt: item.recordedAt,
      })),
    });
  } catch (error) {
    console.error("getMyDeviceTelemetry:", error);

    return res.status(500).json({
      message: "Failed to fetch device telemetry",
    });
  }
}

export async function updateMyDeviceName(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { id } = req.params;
    const { name } = req.body;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device ID",
      });
    }

    if (typeof name !== "string") {
      return res.status(400).json({
        message: "Device name must be a string",
      });
    }

    const cleanName = name.trim();

    if (cleanName.length === 0) {
      return res.status(400).json({
        message: "Device name cannot be empty",
      });
    }

    if (cleanName.length > 50) {
      return res.status(400).json({
        message: "Device name cannot exceed 50 characters",
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

    const updated = await prisma.userDevice.update({
      where: {
        id: userDevice.id,
      },
      data: {
        name: cleanName,
      },
      include: {
        device: {
          include: {
            deviceModel: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Device name updated successfully",

      device: {
        id: updated.device.id,
        deviceCode: updated.device.deviceCode,
        serialNumber: updated.device.serialNumber,
        status: updated.device.status,
        name: updated.name,

        deviceModel: {
          id: updated.device.deviceModel.id,
          name: updated.device.deviceModel.name,
          code: updated.device.deviceModel.code,
        },
      },
    });
  } catch (error) {
    console.error("updateMyDeviceName:", error);

    return res.status(500).json({
      message: "Failed to update device name",
    });
  }
}

// ============================================================
// COMMUNITY MARKETPLACE HELPERS
// ============================================================

const COMMUNITY_PACK_UNITS = [
  "G",
  "KG",
  "PCS",
  "BUNCH",
  "BOX",
  "PACK",
] as const;

const COMMUNITY_HARVEST_AVAILABILITY = ["TODAY", "TOMORROW"] as const;

const COMMUNITY_LISTING_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "SOLD_OUT",
  "REMOVED",
] as const;

const COMMUNITY_ORDER_STATUSES = [
  "PLACED",
  "ACCEPTED",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

async function requireCommunityMember(userId: string, communityId: string) {
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId,
        userId,
      },
    },
    include: {
      community: true,
    },
  });

  if (!membership) {
    return null;
  }

  return membership;
}

function makeCommunityOrderNumber() {
  return `AG-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
}

function publicCommunityListing(listing: any) {
  return {
    id: listing.id,

    communityId: listing.communityId,

    seller: listing.seller
      ? {
          id: listing.seller.id,
          username: listing.seller.username,
        }
      : null,

    cropCycle: listing.cropCycle
      ? {
          id: listing.cropCycle.id,
          cropName: listing.cropCycle.cropName,
          sowingDate: listing.cropCycle.sowingDate,
          estimatedGrowthDays: listing.cropCycle.estimatedGrowthDays,
          expectedHarvestDate: listing.cropCycle.expectedHarvestDate,
          status: listing.cropCycle.status,
          notes: listing.cropCycle.notes,
        }
      : null,

    packSizeValue: listing.packSizeValue?.toString(),

    packSizeUnit: listing.packSizeUnit,

    price: listing.price?.toString(),

    quantityAvailable: listing.quantityAvailable,

    harvestAvailability: listing.harvestAvailability,

    imageUrl: listing.imageUrl,

    imageFileId: listing.imageFileId,

    imageSizeBytes: listing.imageSizeBytes,

    status: listing.status,

    createdAt: listing.createdAt,

    updatedAt: listing.updatedAt,
  };
}

function publicCommunityOrder(order: any) {
  return {
    id: order.id,

    orderNumber: order.orderNumber,

    communityId: order.communityId,

    listingId: order.listingId,

    buyer: order.buyer
      ? {
          id: order.buyer.id,
          username: order.buyer.username,
        }
      : null,

    seller: order.seller
      ? {
          id: order.seller.id,
          username: order.seller.username,
        }
      : null,

    cropName: order.cropName,

    expectedHarvestDate: order.expectedHarvestDate,

    packSizeValue: order.packSizeValue?.toString(),

    packSizeUnit: order.packSizeUnit,

    quantity: order.quantity,

    unitPrice: order.unitPrice?.toString(),

    totalPrice: order.totalPrice?.toString(),

    status: order.status,

    cancelledAt: order.cancelledAt,

    completedAt: order.completedAt,

    createdAt: order.createdAt,

    updatedAt: order.updatedAt,
  };
}

// ============================================================
// GET COMMUNITIES
// GET /api/user/communities
// ============================================================

export async function getCommunities(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const communities = await prisma.community.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        _count: {
          select: {
            members: true,
            listings: true,
          },
        },

        members: {
          where: {
            userId: req.userId,
          },

          select: {
            id: true,
          },
        },
      },
    });

    return res.status(200).json({
      communities: communities.map((community) => ({
        id: community.id,

        name: community.name,

        slug: community.slug,

        description: community.description,

        memberCount: community._count.members,

        listingCount: community._count.listings,

        isMember: community.members.length > 0,

        createdAt: community.createdAt,
      })),
    });
  } catch (error) {
    console.error("getCommunities:", error);

    return res.status(500).json({
      message: "Failed to fetch communities",
    });
  }
}

// ============================================================
// CREATE COMMUNITY
// POST /api/user/communities
// ============================================================

export async function createCommunity(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Community name is required",
      });
    }

    const cleanName = name.trim();

    if (cleanName.length > 80) {
      return res.status(400).json({
        message: "Community name cannot exceed 80 characters",
      });
    }

    const cleanDescription =
      typeof description === "string" && description.trim()
        ? description.trim().slice(0, 500)
        : null;

    const baseSlug =
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50) || "community";

    const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

    const community = await prisma.$transaction(async (tx) => {
      const created = await tx.community.create({
        data: {
          name: cleanName,
          slug,
          description: cleanDescription,
          ownerId: req.userId!,
        },
      });

      await tx.communityMember.create({
        data: {
          communityId: created.id,
          userId: req.userId!,
          role: "OWNER",
        },
      });

      return created;
    });

    return res.status(201).json({
      message: "Community created successfully",

      community,
    });
  } catch (error) {
    console.error("createCommunity:", error);

    return res.status(500).json({
      message: "Failed to create community",
    });
  }
}

// ============================================================
// JOIN COMMUNITY
// POST /api/user/communities/:communityId/join
// ============================================================

export async function joinCommunity(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId } = req.params;

    if (!communityId || Array.isArray(communityId)) {
      return res.status(400).json({
        message: "Invalid community ID",
      });
    }

    const community = await prisma.community.findUnique({
      where: {
        id: communityId,
      },
    });

    if (!community) {
      return res.status(404).json({
        message: "Community not found",
      });
    }

    const existing = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: req.userId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "You are already a community member",
      });
    }

    const member = await prisma.communityMember.create({
      data: {
        communityId,
        userId: req.userId,
        role: "MEMBER",
      },
    });

    return res.status(201).json({
      message: "Joined community successfully",

      membership: member,
    });
  } catch (error) {
    console.error("joinCommunity:", error);

    return res.status(500).json({
      message: "Failed to join community",
    });
  }
}

// ============================================================
// LEAVE COMMUNITY
// DELETE /api/user/communities/:communityId/leave
// ============================================================

export async function leaveCommunity(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId } = req.params;

    if (!communityId || Array.isArray(communityId)) {
      return res.status(400).json({
        message: "Invalid community ID",
      });
    }

    const membership = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: req.userId,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({
        message: "You are not a community member",
      });
    }

    if (membership.role === "OWNER") {
      return res.status(400).json({
        message: "Community owners cannot leave their own community",
      });
    }

    const activeListings = await prisma.communityListing.count({
      where: {
        communityId,

        sellerId: req.userId,

        status: {
          in: ["ACTIVE", "PAUSED", "SOLD_OUT"],
        },
      },
    });

    if (activeListings > 0) {
      return res.status(409).json({
        message:
          "Remove your marketplace listings before leaving the community",
      });
    }

    await prisma.communityMember.delete({
      where: {
        id: membership.id,
      },
    });

    return res.status(200).json({
      message: "Left community successfully",
    });
  } catch (error) {
    console.error("leaveCommunity:", error);

    return res.status(500).json({
      message: "Failed to leave community",
    });
  }
}

// ============================================================
// GET COMMUNITY LISTINGS
// GET /api/user/communities/:communityId/listings
// ============================================================

export async function getCommunityListings(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId } = req.params;

    if (!communityId || Array.isArray(communityId)) {
      return res.status(400).json({
        message: "Invalid community ID",
      });
    }

    const member = await requireCommunityMember(req.userId, communityId);

    if (!member) {
      return res.status(403).json({
        message: "Join this community to view marketplace listings",
      });
    }

    const listings = await prisma.communityListing.findMany({
      where: {
        communityId,
        status: "ACTIVE",
      },

      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },

        cropCycle: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      listings: listings.map(publicCommunityListing),
    });
  } catch (error) {
    console.error("getCommunityListings:", error);

    return res.status(500).json({
      message: "Failed to fetch marketplace listings",
    });
  }
}

// ============================================================
// GET MY COMMUNITY LISTINGS
// GET /api/user/communities/:communityId/my-listings
// ============================================================

export async function getMyCommunityListings(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId } = req.params;

    if (!communityId || Array.isArray(communityId)) {
      return res.status(400).json({
        message: "Invalid community ID",
      });
    }

    const member = await requireCommunityMember(req.userId, communityId);

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this community",
      });
    }

    const listings = await prisma.communityListing.findMany({
      where: {
        communityId,
        sellerId: req.userId,
      },

      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },

        cropCycle: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      listings: listings.map(publicCommunityListing),
    });
  } catch (error) {
    console.error("getMyCommunityListings:", error);

    return res.status(500).json({
      message: "Failed to fetch your listings",
    });
  }
}

// ============================================================
// GET SINGLE LISTING
// GET /api/user/communities/:communityId/listings/:listingId
// ============================================================

export async function getCommunityListing(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId, listingId } = req.params;

    if (
      !communityId ||
      Array.isArray(communityId) ||
      !listingId ||
      Array.isArray(listingId)
    ) {
      return res.status(400).json({
        message: "Invalid community or listing ID",
      });
    }

    const member = await requireCommunityMember(req.userId, communityId);

    if (!member) {
      return res.status(403).json({
        message: "You are not a member of this community",
      });
    }

    const listing = await prisma.communityListing.findFirst({
      where: {
        id: listingId,
        communityId,
      },

      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },

        cropCycle: true,
      },
    });

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found",
      });
    }

    return res.status(200).json({
      listing: publicCommunityListing(listing),
    });
  } catch (error) {
    console.error("getCommunityListing:", error);

    return res.status(500).json({
      message: "Failed to fetch listing",
    });
  }
}

// ============================================================
// CREATE LISTING
// POST /api/user/communities/:communityId/listings
// ============================================================

export async function createCommunityListing(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId } = req.params;

    const {
      cropCycleId,
      packSizeValue,
      packSizeUnit,
      price,
      quantityAvailable,
      harvestAvailability,
      imageUrl,
      imageFileId,
      imageSizeBytes,
    } = req.body;

    if (
      !communityId ||
      Array.isArray(communityId) ||
      !cropCycleId ||
      typeof cropCycleId !== "string"
    ) {
      return res.status(400).json({
        message: "communityId and cropCycleId are required",
      });
    }

    const member = await requireCommunityMember(req.userId, communityId);

    if (!member) {
      return res.status(403).json({
        message: "Join the community before selling",
      });
    }

    if (!COMMUNITY_PACK_UNITS.includes(packSizeUnit)) {
      return res.status(400).json({
        message: "Invalid packSizeUnit",
      });
    }

    if (!COMMUNITY_HARVEST_AVAILABILITY.includes(harvestAvailability)) {
      return res.status(400).json({
        message: "Invalid harvestAvailability",
      });
    }

    const packSize = Number(packSizeValue);

    const listingPrice = Number(price);

    if (!Number.isFinite(packSize) || packSize <= 0 || packSize > 1000000) {
      return res.status(400).json({
        message: "packSizeValue must be greater than zero",
      });
    }

    if (!Number.isFinite(listingPrice) || listingPrice <= 0) {
      return res.status(400).json({
        message: "price must be greater than zero",
      });
    }

    let quantity: number | null = null;

    if (quantityAvailable !== undefined && quantityAvailable !== null) {
      quantity = Number(quantityAvailable);

      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000000) {
        return res.status(400).json({
          message: "quantityAvailable must be a positive integer",
        });
      }
    }

    // --------------------------------------------------------
    // Verify crop belongs to seller
    // --------------------------------------------------------

    const cropCycle = await prisma.trayCropCycle.findFirst({
      where: {
        id: cropCycleId,

        tray: {
          row: {
            rack: {
              userId: req.userId,
              status: "ACTIVE",
            },
          },
        },
      },

      include: {
        tray: {
          include: {
            row: {
              include: {
                rack: true,
              },
            },
          },
        },
      },
    });

    if (!cropCycle) {
      return res.status(404).json({
        message: "Crop cycle not found or does not belong to you",
      });
    }

    if (!["GROWING", "READY"].includes(cropCycle.status)) {
      return res.status(400).json({
        message: "Only an active crop cycle can be listed",
      });
    }

    // --------------------------------------------------------
    // Prevent duplicate listing in same community
    // --------------------------------------------------------

    const existing = await prisma.communityListing.findUnique({
      where: {
        communityId_cropCycleId: {
          communityId,
          cropCycleId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "This crop cycle already has a listing in this community",
      });
    }

    const listing = await prisma.communityListing.create({
      data: {
        communityId,
        sellerId: req.userId,
        cropCycleId,

        packSizeValue: packSize,

        packSizeUnit,

        price: listingPrice,

        quantityAvailable: quantity,

        harvestAvailability,

        imageUrl:
          typeof imageUrl === "string" && imageUrl.trim()
            ? imageUrl.trim()
            : null,

        imageFileId:
          typeof imageFileId === "string" && imageFileId.trim()
            ? imageFileId.trim()
            : null,

        imageSizeBytes:
          imageSizeBytes !== undefined && imageSizeBytes !== null
            ? Number(imageSizeBytes)
            : null,

        status: "ACTIVE",
      },

      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },

        cropCycle: true,
      },
    });

    return res.status(201).json({
      message: "Marketplace listing created successfully",

      listing: publicCommunityListing(listing),
    });
  } catch (error) {
    console.error("createCommunityListing:", error);

    return res.status(500).json({
      message: "Failed to create marketplace listing",
    });
  }
}

// ============================================================
// UPDATE LISTING
// PATCH /api/user/communities/:communityId/listings/:listingId
// ============================================================

export async function updateCommunityListing(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId, listingId } = req.params;

    if (
      !communityId ||
      Array.isArray(communityId) ||
      !listingId ||
      Array.isArray(listingId)
    ) {
      return res.status(400).json({
        message: "Invalid community or listing ID",
      });
    }

    const listing = await prisma.communityListing.findFirst({
      where: {
        id: listingId,
        communityId,
        sellerId: req.userId,
      },
    });

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found or does not belong to you",
      });
    }

    if (listing.status === "REMOVED") {
      return res.status(400).json({
        message: "Removed listings cannot be edited",
      });
    }

    const {
      packSizeValue,
      packSizeUnit,
      price,
      quantityAvailable,
      harvestAvailability,
      imageUrl,
      imageFileId,
      imageSizeBytes,
      status,
    } = req.body;

    const data: Record<string, unknown> = {};

    // --------------------------------------------------------
    // PACK SIZE
    // --------------------------------------------------------

    if (packSizeValue !== undefined) {
      const value = Number(packSizeValue);

      if (!Number.isFinite(value) || value <= 0) {
        return res.status(400).json({
          message: "packSizeValue must be greater than zero",
        });
      }

      data.packSizeValue = value;
    }

    if (packSizeUnit !== undefined) {
      if (!COMMUNITY_PACK_UNITS.includes(packSizeUnit)) {
        return res.status(400).json({
          message: "Invalid packSizeUnit",
        });
      }

      data.packSizeUnit = packSizeUnit;
    }

    // --------------------------------------------------------
    // PRICE
    // --------------------------------------------------------

    if (price !== undefined) {
      const value = Number(price);

      if (!Number.isFinite(value) || value <= 0) {
        return res.status(400).json({
          message: "price must be greater than zero",
        });
      }

      data.price = value;
    }

    // --------------------------------------------------------
    // QUANTITY
    // --------------------------------------------------------

    let nextQuantity = listing.quantityAvailable;

    if (quantityAvailable !== undefined) {
      if (quantityAvailable === null) {
        nextQuantity = null;
        data.quantityAvailable = null;
      } else {
        const value = Number(quantityAvailable);

        if (!Number.isInteger(value) || value < 0 || value > 1000000) {
          return res.status(400).json({
            message: "quantityAvailable must be zero or a positive integer",
          });
        }

        nextQuantity = value;

        data.quantityAvailable = value;
      }
    }

    // --------------------------------------------------------
    // AVAILABILITY
    // --------------------------------------------------------

    if (harvestAvailability !== undefined) {
      if (!COMMUNITY_HARVEST_AVAILABILITY.includes(harvestAvailability)) {
        return res.status(400).json({
          message: "Invalid harvestAvailability",
        });
      }

      data.harvestAvailability = harvestAvailability;
    }

    // --------------------------------------------------------
    // IMAGE
    // --------------------------------------------------------

    if (imageUrl !== undefined) {
      data.imageUrl =
        typeof imageUrl === "string" && imageUrl.trim()
          ? imageUrl.trim()
          : null;
    }

    if (imageFileId !== undefined) {
      data.imageFileId =
        typeof imageFileId === "string" && imageFileId.trim()
          ? imageFileId.trim()
          : null;
    }

    if (imageSizeBytes !== undefined) {
      data.imageSizeBytes =
        imageSizeBytes === null ? null : Number(imageSizeBytes);
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    let nextStatus = listing.status;

    if (status !== undefined) {
      if (!COMMUNITY_LISTING_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Invalid listing status",
        });
      }

      nextStatus = status;
    }

    if (nextQuantity !== null && nextQuantity === 0) {
      nextStatus = "SOLD_OUT";
    }

    if (
      nextQuantity !== null &&
      nextQuantity > 0 &&
      listing.status === "SOLD_OUT" &&
      status === undefined
    ) {
      nextStatus = "ACTIVE";
    }

    if (nextStatus === "ACTIVE" && nextQuantity !== null && nextQuantity <= 0) {
      return res.status(400).json({
        message: "An active listing must have available quantity",
      });
    }

    data.status = nextStatus;

    const updated = await prisma.communityListing.update({
      where: {
        id: listing.id,
      },

      data,

      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },

        cropCycle: true,
      },
    });

    return res.status(200).json({
      message: "Marketplace listing updated successfully",

      listing: publicCommunityListing(updated),
    });
  } catch (error) {
    console.error("updateCommunityListing:", error);

    return res.status(500).json({
      message: "Failed to update marketplace listing",
    });
  }
}

// ============================================================
// REMOVE LISTING
// DELETE /api/user/communities/:communityId/listings/:listingId
// ============================================================

export async function removeCommunityListing(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId, listingId } = req.params;

    if (
      !communityId ||
      Array.isArray(communityId) ||
      !listingId ||
      Array.isArray(listingId)
    ) {
      return res.status(400).json({
        message: "Invalid community or listing ID",
      });
    }

    const listing = await prisma.communityListing.findFirst({
      where: {
        id: listingId,
        communityId,
        sellerId: req.userId,
      },
    });

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found or does not belong to you",
      });
    }

    if (listing.status === "REMOVED") {
      return res.status(400).json({
        message: "Listing is already removed",
      });
    }

    const updated = await prisma.communityListing.update({
      where: {
        id: listing.id,
      },

      data: {
        status: "REMOVED",
      },
    });

    return res.status(200).json({
      message: "Marketplace listing removed successfully",

      listing: updated,
    });
  } catch (error) {
    console.error("removeCommunityListing:", error);

    return res.status(500).json({
      message: "Failed to remove marketplace listing",
    });
  }
}

// ============================================================
// BUY LISTING
// POST /api/user/communities/:communityId/listings/:listingId/orders
//
// This immediately reserves/decrements listing inventory.
// No payment is performed here.
// ============================================================

export async function createCommunityOrder(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId, listingId } = req.params;

    const { quantity } = req.body;

    if (
      !communityId ||
      Array.isArray(communityId) ||
      !listingId ||
      Array.isArray(listingId)
    ) {
      return res.status(400).json({
        message: "Invalid community or listing ID",
      });
    }

    const requestedQuantity = Number(quantity);

    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity <= 0 ||
      requestedQuantity > 10000
    ) {
      return res.status(400).json({
        message: "quantity must be a positive integer",
      });
    }

    const buyerMembership = await requireCommunityMember(
      req.userId,
      communityId,
    );

    if (!buyerMembership) {
      return res.status(403).json({
        message: "Join this community before buying",
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      // --------------------------------------------------
      // Get current listing
      // --------------------------------------------------

      const listing = await tx.communityListing.findFirst({
        where: {
          id: listingId,
          communityId,
        },

        include: {
          cropCycle: true,

          seller: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      if (!listing) {
        throw new Error("LISTING_NOT_FOUND");
      }

      if (listing.sellerId === req.userId) {
        throw new Error("OWN_LISTING");
      }

      if (listing.status !== "ACTIVE") {
        throw new Error("LISTING_NOT_ACTIVE");
      }

      if (["CANCELLED"].includes(listing.cropCycle.status)) {
        throw new Error("CROP_NOT_AVAILABLE");
      }

      // --------------------------------------------------
      // Seller must still be in community
      // --------------------------------------------------

      const sellerMembership = await tx.communityMember.findUnique({
        where: {
          communityId_userId: {
            communityId,
            userId: listing.sellerId,
          },
        },
      });

      if (!sellerMembership) {
        throw new Error("SELLER_NOT_MEMBER");
      }

      // --------------------------------------------------
      // Atomic inventory reservation
      //
      // updatedAt is included so a price/stock change
      // between read and reservation causes a retry
      // instead of purchasing stale listing data.
      // --------------------------------------------------

      const newQuantity =
        listing.quantityAvailable === null
          ? null
          : listing.quantityAvailable - requestedQuantity;

      if (newQuantity !== null && newQuantity < 0) {
        throw new Error("INSUFFICIENT_QUANTITY");
      }

      const reservation = await tx.communityListing.updateMany({
        where: {
          id: listing.id,

          status: "ACTIVE",

          updatedAt: listing.updatedAt,

          ...(listing.quantityAvailable !== null
            ? {
                quantityAvailable: {
                  gte: requestedQuantity,
                },
              }
            : {}),
        },

        data: {
          quantityAvailable:
            listing.quantityAvailable === null
              ? null
              : {
                  decrement: requestedQuantity,
                },

          status: newQuantity === 0 ? "SOLD_OUT" : "ACTIVE",

          updatedAt: new Date(),
        },
      });

      if (reservation.count !== 1) {
        throw new Error("LISTING_CHANGED");
      }

      // --------------------------------------------------
      // Calculate total using backend price
      // --------------------------------------------------

      const totalPrice = listing.price.mul(requestedQuantity);

      // --------------------------------------------------
      // Create order
      // --------------------------------------------------

      const created = await tx.communityOrder.create({
        data: {
          orderNumber: makeCommunityOrderNumber(),

          communityId,

          listingId: listing.id,

          buyerId: req.userId!,

          sellerId: listing.sellerId,

          cropName: listing.cropCycle.cropName,

          expectedHarvestDate: listing.cropCycle.expectedHarvestDate,

          packSizeValue: listing.packSizeValue,

          packSizeUnit: listing.packSizeUnit,

          quantity: requestedQuantity,

          unitPrice: listing.price,

          totalPrice,

          status: "PLACED",
        },

        include: {
          buyer: {
            select: {
              id: true,
              username: true,
            },
          },

          seller: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      return created;
    });

    return res.status(201).json({
      message: "Order placed successfully",

      order: publicCommunityOrder(order),
    });
  } catch (error: any) {
    console.error("createCommunityOrder:", error);

    const code = error instanceof Error ? error.message : "";

    if (code === "LISTING_NOT_FOUND") {
      return res.status(404).json({
        message: "Marketplace listing not found",
      });
    }

    if (code === "OWN_LISTING") {
      return res.status(400).json({
        message: "You cannot buy your own listing",
      });
    }

    if (code === "LISTING_NOT_ACTIVE") {
      return res.status(409).json({
        message: "This listing is no longer available",
      });
    }

    if (code === "CROP_NOT_AVAILABLE") {
      return res.status(409).json({
        message: "This crop is no longer available",
      });
    }

    if (code === "SELLER_NOT_MEMBER") {
      return res.status(409).json({
        message: "The seller is no longer a member of this community",
      });
    }

    if (code === "INSUFFICIENT_QUANTITY") {
      return res.status(409).json({
        message: "Requested quantity is not available",
      });
    }

    if (code === "LISTING_CHANGED") {
      return res.status(409).json({
        message: "Listing changed while you were purchasing. Please try again.",
      });
    }

    return res.status(500).json({
      message: "Failed to place marketplace order",
    });
  }
}

// ============================================================
// BUYER ORDERS
// GET /api/user/communities/:communityId/orders/buying
// ============================================================

export async function getMyBuyingOrders(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId } = req.params;

    if (!communityId || Array.isArray(communityId)) {
      return res.status(400).json({
        message: "Invalid community ID",
      });
    }

    const member = await requireCommunityMember(req.userId, communityId);

    if (!member) {
      return res.status(403).json({
        message: "You are not a community member",
      });
    }

    const orders = await prisma.communityOrder.findMany({
      where: {
        communityId,
        buyerId: req.userId,
      },

      include: {
        buyer: {
          select: {
            id: true,
            username: true,
          },
        },

        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      orders: orders.map(publicCommunityOrder),
    });
  } catch (error) {
    console.error("getMyBuyingOrders:", error);

    return res.status(500).json({
      message: "Failed to fetch buying orders",
    });
  }
}

// ============================================================
// SELLER ORDERS
// GET /api/user/communities/:communityId/orders/selling
// ============================================================

export async function getMySellingOrders(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId } = req.params;

    if (!communityId || Array.isArray(communityId)) {
      return res.status(400).json({
        message: "Invalid community ID",
      });
    }

    const member = await requireCommunityMember(req.userId, communityId);

    if (!member) {
      return res.status(403).json({
        message: "You are not a community member",
      });
    }

    const orders = await prisma.communityOrder.findMany({
      where: {
        communityId,
        sellerId: req.userId,
      },

      include: {
        buyer: {
          select: {
            id: true,
            username: true,
          },
        },

        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      orders: orders.map(publicCommunityOrder),
    });
  } catch (error) {
    console.error("getMySellingOrders:", error);

    return res.status(500).json({
      message: "Failed to fetch selling orders",
    });
  }
}

// ============================================================
// GET SINGLE ORDER
// GET /api/user/communities/:communityId/orders/:orderId
// ============================================================

export async function getCommunityOrder(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId, orderId } = req.params;

    if (
      !communityId ||
      Array.isArray(communityId) ||
      !orderId ||
      Array.isArray(orderId)
    ) {
      return res.status(400).json({
        message: "Invalid community or order ID",
      });
    }

    const order = await prisma.communityOrder.findFirst({
      where: {
        id: orderId,
        communityId,

        OR: [
          {
            buyerId: req.userId,
          },

          {
            sellerId: req.userId,
          },
        ],
      },

      include: {
        buyer: {
          select: {
            id: true,
            username: true,
          },
        },

        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(200).json({
      order: publicCommunityOrder(order),
    });
  } catch (error) {
    console.error("getCommunityOrder:", error);

    return res.status(500).json({
      message: "Failed to fetch order",
    });
  }
}

// ============================================================
// UPDATE ORDER STATUS
// PATCH /api/user/communities/:communityId/orders/:orderId/status
// ============================================================

export async function updateCommunityOrderStatus(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { communityId, orderId } = req.params;

    const { status: requestedStatus } = req.body;

    if (
      !communityId ||
      Array.isArray(communityId) ||
      !orderId ||
      Array.isArray(orderId)
    ) {
      return res.status(400).json({
        message: "Invalid community or order ID",
      });
    }

    if (!COMMUNITY_ORDER_STATUSES.includes(requestedStatus)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await prisma.communityOrder.findFirst({
      where: {
        id: orderId,
        communityId,
      },

      include: {
        listing: true,

        buyer: {
          select: {
            id: true,
            username: true,
          },
        },

        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const isBuyer = order.buyerId === req.userId;

    const isSeller = order.sellerId === req.userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        message: "You are not allowed to modify this order",
      });
    }

    // ========================================================
    // CANCEL
    // ========================================================

    if (requestedStatus === "CANCELLED") {
      if (isBuyer && order.status !== "PLACED") {
        return res.status(400).json({
          message: "Buyer can cancel only before seller acceptance",
        });
      }

      if (isSeller && !["PLACED", "ACCEPTED", "READY"].includes(order.status)) {
        return res.status(400).json({
          message: "This order can no longer be cancelled",
        });
      }

      const cancelled = await prisma.$transaction(async (tx) => {
        const changed = await tx.communityOrder.updateMany({
          where: {
            id: order.id,

            status: order.status,
          },

          data: {
            status: "CANCELLED",

            cancelledAt: new Date(),
          },
        });

        if (changed.count !== 1) {
          throw new Error("ORDER_CHANGED");
        }

        // Return reserved inventory
        if (order.listing.quantityAvailable !== null) {
          await tx.communityListing.update({
            where: {
              id: order.listingId,
            },

            data: {
              quantityAvailable: {
                increment: order.quantity,
              },

              ...(order.listing.status === "SOLD_OUT"
                ? {
                    status: "ACTIVE",
                  }
                : {}),
            },
          });
        }

        return tx.communityOrder.findUnique({
          where: {
            id: order.id,
          },

          include: {
            buyer: {
              select: {
                id: true,
                username: true,
              },
            },

            seller: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        });
      });

      return res.status(200).json({
        message: "Order cancelled successfully",

        order: publicCommunityOrder(cancelled),
      });
    }

    // ========================================================
    // SELLER STATE MACHINE
    // ========================================================

    if (!isSeller) {
      return res.status(403).json({
        message: "Only the seller can change the order to this state",
      });
    }

    const validTransition =
      (order.status === "PLACED" && requestedStatus === "ACCEPTED") ||
      (order.status === "ACCEPTED" && requestedStatus === "READY") ||
      (order.status === "READY" && requestedStatus === "COMPLETED");

    if (!validTransition) {
      return res.status(400).json({
        message: `Invalid order transition: ${order.status} → ${requestedStatus}`,
      });
    }

    const data: Record<string, unknown> = {
      status: requestedStatus,
    };

    if (requestedStatus === "COMPLETED") {
      data.completedAt = new Date();
    }

    const updated = await prisma.communityOrder.updateMany({
      where: {
        id: order.id,
        status: order.status,
      },

      data,
    });

    if (updated.count !== 1) {
      return res.status(409).json({
        message: "Order changed before your update completed",
      });
    }

    const finalOrder = await prisma.communityOrder.findUnique({
      where: {
        id: order.id,
      },

      include: {
        buyer: {
          select: {
            id: true,
            username: true,
          },
        },

        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Order status updated successfully",

      order: publicCommunityOrder(finalOrder),
    });
  } catch (error: any) {
    console.error("updateCommunityOrderStatus:", error);

    if (error?.message === "ORDER_CHANGED") {
      return res.status(409).json({
        message: "Order changed before cancellation completed",
      });
    }

    return res.status(500).json({
      message: "Failed to update order status",
    });
  }
}
