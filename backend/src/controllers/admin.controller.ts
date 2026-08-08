import type { Request, Response } from 'express';
import { prisma } from "../lib/prisma"; 
import type { AuthRequest } from '../middleware/auth.middleware';
import { log } from 'node:console';
import { model } from 'mongoose';





export async function createDeviceModel(
  req: Request,
  res: Response
) {
  try {
    const {
      name,
      code,
      description,
      version,
    } = req.body;

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

    const existingModel =
      await prisma.deviceModel.findUnique({
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

    const deviceModel =
      await prisma.deviceModel.create({
        data: {
          name,
          code,
          description: description || null,
          version: version || null,
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
        status: deviceModel.status,
        createdAt: deviceModel.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Create Device Model Error:",
      error
    );

    return res.status(500).json({
      message: "Failed to create device model",
    });
  }
}


// get registered devices 
export async function getAllDeviceModel(
  req: AuthRequest,
  res: Response
){
    try {
        const deviceModels = await prisma.deviceModel.findMany({
            orderBy:{
                createdAt:"desc"
            },
            include:{
                _count:{
                    select:{
                        devices:true,
                    }
                }
            }
        })

      
        

        return res.status(200).json({
            message:"device models fetched successfully",
            deviceModels:deviceModels.map((model)=>({
                id:model.id,
                name:model.name,
                code: model.code,
        description: model.description,
        version: model.version,
        status: model.status,

        // Number of physical devices registered
        deviceCount: model._count.devices,

        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
            }))
        })


    } catch (error) {
        
    }
}

// get models by id 

export async function getDeviceModelById(req:AuthRequest, res:Response) {
    try {
        const {id} = req.params

        if (!id || Array.isArray(id)) {
            return res.status(400).json({
                message:"invalid device model id"
            })

        }

        const deviceModel= await prisma.deviceModel.findUnique({
            where:{
                id:id
            },
            include:{
                _count:{
                    select:{
                        devices:true
                    }
                }
            }
        })

        if (!deviceModel){
            return res.status(400).json({
                message:"device model not found"
            })
        }

        return res.status(200).json({
            message:"device model fetched successfully",
            deviceModel:{
                id:deviceModel.id,
                name: deviceModel.name,
        code: deviceModel.code,
        description: deviceModel.description,
        version: deviceModel.version,
        status: deviceModel.status,

        deviceCount: deviceModel._count.devices,

        createdAt: deviceModel.createdAt,
        updatedAt: deviceModel.updatedAt,
            }
        })

    } catch (error) {
        
    }
}


// update  device model 
export async function updateDeviceModel(
  req: AuthRequest,
  res: Response
) {
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
    } = req.body;

    const existingModel =
      await prisma.deviceModel.findUnique({
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
    if (
      code !== undefined &&
      code !== existingModel.code
    ) {
      const codeExists =
        await prisma.deviceModel.findUnique({
          where: {
            code,
          },
        });

      if (codeExists) {
        return res.status(409).json({
          message:
            "A device model with this code already exists",
        });
      }
    }

    const updatedModel =
      await prisma.deviceModel.update({
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
        },
      });

    return res.status(200).json({
      message: "Device model updated successfully",

      deviceModel: updatedModel,
    });
  } catch (error) {
    console.error(
      "Update Device Model Error:",
      error
    );

    return res.status(500).json({
      message: "Failed to update device model",
    });
  }
}


// delete device model 
export async function deleteDeviceModel(
  req: AuthRequest,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        message: "Invalid device model ID",
      });
    }

    const deviceModel =
      await prisma.deviceModel.findUnique({
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
    console.error(
      "Delete Device Model Error:",
      error
    );

    return res.status(500).json({
      message: "Failed to delete device model",
    });
  }
}






// ============================================================
// REGISTER A NEW PHYSICAL DEVICE
// ADMIN / SUPER_ADMIN ONLY
// ============================================================



export async function registerDevice(
  req: Request,
  res: Response
) {
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

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!deviceCode || !serialNumber || !deviceModelId) {
      return res.status(400).json({
        message:
          "Device code, serial number and device model are required",
      });
    }

    // --------------------------------------------------------
    // CHECK DEVICE MODEL
    // --------------------------------------------------------

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

    if (deviceModel.status !== "ACTIVE") {
      return res.status(400).json({
        message: "This device model is not active",
      });
    }

    // --------------------------------------------------------
    // CHECK DEVICE CODE / SERIAL NUMBER
    // --------------------------------------------------------

    const existingDevice =
      await prisma.device.findFirst({
        where: {
          OR: [
            {
              deviceCode,
            },
            {
              serialNumber,
            },
            ...(macAddress
              ? [{ macAddress }]
              : []),
            ...(chipId
              ? [{ chipId }]
              : []),
          ],
        },
      });

    if (existingDevice) {
      return res.status(409).json({
        message:
          "A device with the same device code, serial number, MAC address or chip ID already exists",
      });
    }

    // --------------------------------------------------------
    // CREATE DEVICE
    // --------------------------------------------------------

    const device = await prisma.device.create({
      data: {
        deviceCode,
        serialNumber,
        macAddress: macAddress || null,
        chipId: chipId || null,
        deviceModelId,
        batchNumber: batchNumber || null,
        manufacturedAt: manufacturedAt
          ? new Date(manufacturedAt)
          : null,

        // New device is available for purchase/linking
        status: "AVAILABLE",
      },

      include: {
        deviceModel: true,
      },
    });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({
      message: "Device registered successfully",

      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        serialNumber: device.serialNumber,
        macAddress: device.macAddress,
        chipId: device.chipId,

        deviceModel: {
          id: device.deviceModel.id,
          name: device.deviceModel.name,
          code: device.deviceModel.code,
          version: device.deviceModel.version,
        },

        status: device.status,
        batchNumber: device.batchNumber,
        manufacturedAt: device.manufacturedAt,
        createdAt: device.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Register Device Error:",
      error
    );

    return res.status(500).json({
      message: "Failed to register device",
    });
  }
}