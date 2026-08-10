import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";

// ======================================================
// GET MY PROFILE
// GET /api/user/profile
// ======================================================

export async function getProfile(
    req: AuthRequest,
    res: Response
) {
    try {
        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: req.userId
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
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            user
        });

    } catch (error) {
        console.error("getProfile:", error);

        return res.status(500).json({
            message: "Failed to fetch profile"
        });
    }
}


// ======================================================
// UPDATE MY PROFILE
// PATCH /api/user/profile
// ======================================================

export async function updateProfile(
    req: AuthRequest,
    res: Response
) {
    try {
        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const {
            username,
            countryCode,
            phoneNo
        } = req.body;

        // -----------------------------
        // Check username
        // -----------------------------

        if (username) {
            const existingUser =
                await prisma.user.findFirst({
                    where: {
                        username,
                        NOT: {
                            id: req.userId
                        }
                    }
                });

            if (existingUser) {
                return res.status(409).json({
                    message: "Username already exists"
                });
            }
        }

        // -----------------------------
        // Update
        // -----------------------------

        const user =
            await prisma.user.update({
                where: {
                    id: req.userId
                },

                data: {
                    ...(username !== undefined && {
                        username
                    }),

                    ...(countryCode !== undefined && {
                        countryCode
                    }),

                    ...(phoneNo !== undefined && {
                        phoneNo
                    })
                },

                select: {
                    id: true,
                    username: true,
                    email: true,
                    countryCode: true,
                    phoneNo: true,
                    role: true,
                    verified: true,
                    updatedAt: true
                }
            });

        return res.status(200).json({
            message: "Profile updated successfully",
            user
        });

    } catch (error) {
        console.error("updateProfile:", error);

        return res.status(500).json({
            message: "Failed to update profile"
        });
    }
}


// ======================================================
// GET MY DEVICES
// GET /api/user/devices
// ======================================================
export async function getMyDevices(
    req: AuthRequest,
    res: Response
) {
    try {
        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const userDevices =
            await prisma.userDevice.findMany({
                where: {
                    userId: req.userId
                },
                include: {
                    device: {
                        include: {
                            deviceModel: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

        return res.status(200).json({
            devices: userDevices.map((item) => ({
                id: item.device.id,
                deviceCode: item.device.deviceCode,
                serialNumber: item.device.serialNumber,
                status: item.device.status,
                linkedAt: item.device.linkedAt,
                name: item.name,

                deviceModel: {
                    id: item.device.deviceModel.id,
                    name: item.device.deviceModel.name,
                    code: item.device.deviceModel.code,
                    imageUrl:item.device.deviceModel.imageUrl
                }
            }))
        });

    } catch (error) {

        console.error(
            "getMyDevices:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch devices"
        });
    }
}


// ======================================================
// GET MY SINGLE DEVICE
// GET /api/user/devices/:id
// ======================================================
export async function getMyDevice(
    req: AuthRequest,
    res: Response
) {
    try {
        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const { id } = req.params;

        if (!id || Array.isArray(id)) {
            return res.status(400).json({
                message: "Invalid device ID"
            });
        }

        const userDevice =
            await prisma.userDevice.findFirst({
                where: {
                    userId: req.userId,
                    deviceId: id
                },
                include: {
                    device: {
                        include: {
                            deviceModel: true
                        }
                    }
                }
            });

        if (!userDevice) {
            return res.status(404).json({
                message:
                    "Device not found or does not belong to you"
            });
        }

        return res.status(200).json({
            device: {
                id: userDevice.device.id,
                deviceCode: userDevice.device.deviceCode,
                serialNumber: userDevice.device.serialNumber,
                status: userDevice.device.status,
                linkedAt: userDevice.device.linkedAt,

                // User's private name
                name: userDevice.name,

                deviceModel: {
                    id: userDevice.device.deviceModel.id,
                    name: userDevice.device.deviceModel.name,
                    code: userDevice.device.deviceModel.code
                }
            }
        });

    } catch (error) {

        console.error(
            "getMyDevice:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch device"
        });
    }
}

// ======================================================
// CLAIM DEVICE
// POST /api/user/devices/claim
// ======================================================
export async function claimDevice(
    req: AuthRequest,
    res: Response
) {
    try {

        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const {
            deviceCode,
            serialNumber
        } = req.body;

        if (!deviceCode && !serialNumber) {
            return res.status(400).json({
                message:
                    "deviceCode or serialNumber is required"
            });
        }

        // ---------------------------------------------
        // Find AVAILABLE physical device
        // ---------------------------------------------

        const device =
            await prisma.device.findFirst({
                where: {
                    status: "AVAILABLE",

                    OR: [
                        ...(deviceCode
                            ? [{ deviceCode }]
                            : []),

                        ...(serialNumber
                            ? [{ serialNumber }]
                            : [])
                    ]
                }
            });

        if (!device) {
            return res.status(404).json({
                message:
                    "Available device not found"
            });
        }

        // ---------------------------------------------
        // Make sure user hasn't already linked it
        // ---------------------------------------------

        const existingUserDevice =
            await prisma.userDevice.findUnique({
                where: {
                    userId_deviceId: {
                        userId: req.userId,
                        deviceId: device.id
                    }
                }
            });

        if (existingUserDevice) {
            return res.status(409).json({
                message:
                    "Device is already linked to your account"
            });
        }

        // ---------------------------------------------
        // Create user-device relationship
        // ---------------------------------------------

        const userDevice =
            await prisma.$transaction(
                async (tx) => {

                    const updatedDevice =
                        await tx.device.update({
                            where: {
                                id: device.id
                            },

                            data: {
                                status: "LINKED",
                                linkedAt: new Date()
                            }
                        });

                    const relation =
                        await tx.userDevice.create({
                            data: {
                                userId: req.userId!,
                                deviceId: device.id,
                                name: null
                            },

                            include: {
                                device: {
                                    include: {
                                        deviceModel: true
                                    }
                                }
                            }
                        });

                    return relation;
                }
            );

        return res.status(200).json({
            message:
                "Device linked successfully",

            device: {
                id: userDevice.device.id,
                deviceCode:
                    userDevice.device.deviceCode,
                serialNumber:
                    userDevice.device.serialNumber,
                status:
                    userDevice.device.status,
                linkedAt:
                    userDevice.device.linkedAt,

                name:
                    userDevice.name,

                deviceModel: {
                    id:
                        userDevice.device.deviceModel.id,

                    name:
                        userDevice.device.deviceModel.name,

                    code:
                        userDevice.device.deviceModel.code
                }
            }
        });

    } catch (error) {

        console.error(
            "claimDevice:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to claim device"
        });
    }
}

// ======================================================
// UNLINK DEVICE
// DELETE /api/user/devices/:id
// ======================================================
export async function unlinkDevice(
    req: AuthRequest,
    res: Response
) {
    try {

        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const { id } = req.params;

        if (!id || Array.isArray(id)) {
            return res.status(400).json({
                message: "Invalid device ID"
            });
        }

        const userDevice =
            await prisma.userDevice.findFirst({
                where: {
                    userId: req.userId,
                    deviceId: id
                }
            });

        if (!userDevice) {
            return res.status(404).json({
                message:
                    "Device not found or does not belong to you"
            });
        }

        await prisma.$transaction(
            async (tx) => {

                await tx.userDevice.delete({
                    where: {
                        id: userDevice.id
                    }
                });

                await tx.device.update({
                    where: {
                        id
                    },

                    data: {
                        status: "AVAILABLE",
                        linkedAt: null
                    }
                });
            }
        );

        return res.status(200).json({
            message:
                "Device disconnected successfully"
        });

    } catch (error) {

        console.error(
            "unlinkDevice:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to disconnect device"
        });
    }
}


export async function getMyDeviceTelemetry(
    req: AuthRequest,
    res: Response
) {
    try {

        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const { id } = req.params;

        if (!id || Array.isArray(id)) {
            return res.status(400).json({
                message: "Invalid device ID"
            });
        }

        // ---------------------------------------------
        // Check USER owns/has linked this device
        // ---------------------------------------------

        const userDevice =
            await prisma.userDevice.findFirst({
                where: {
                    userId: req.userId,
                    deviceId: id
                }
            });

        if (!userDevice) {
            return res.status(404).json({
                message:
                    "Device not found or does not belong to you"
            });
        }

        // ---------------------------------------------
        // Get telemetry
        // ---------------------------------------------

        const telemetry =
            await prisma.deviceTelemetry.findMany({
                where: {
                    deviceId: id
                },
                orderBy: {
                    recordedAt: "desc"
                },
                take: 50
            });

        return res.status(200).json({
            deviceId: id,
            telemetry
        });

    } catch (error) {

        console.error(
            "getMyDeviceTelemetry:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to fetch device telemetry"
        });
    }
}

export async function updateMyDeviceName(
    req: AuthRequest,
    res: Response
) {
    try {

        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const { id } = req.params;
        const { name } = req.body;

        if (!id || Array.isArray(id)) {
            return res.status(400).json({
                message: "Invalid device ID"
            });
        }

        if (
            typeof name !== "string"
        ) {
            return res.status(400).json({
                message:
                    "Device name must be a string"
            });
        }

        const cleanName =
            name.trim();

        if (
            cleanName.length === 0
        ) {
            return res.status(400).json({
                message:
                    "Device name cannot be empty"
            });
        }

        if (
            cleanName.length > 50
        ) {
            return res.status(400).json({
                message:
                    "Device name cannot exceed 50 characters"
            });
        }

        const userDevice =
            await prisma.userDevice.findFirst({
                where: {
                    userId: req.userId,
                    deviceId: id
                }
            });

        if (!userDevice) {
            return res.status(404).json({
                message:
                    "Device not found or does not belong to you"
            });
        }

        const updated =
            await prisma.userDevice.update({
                where: {
                    id: userDevice.id
                },
                data: {
                    name: cleanName
                },
                include: {
                    device: {
                        include: {
                            deviceModel: true
                        }
                    }
                }
            });

        return res.status(200).json({
            message:
                "Device name updated successfully",

            device: {
                id: updated.device.id,
                deviceCode:
                    updated.device.deviceCode,
                serialNumber:
                    updated.device.serialNumber,
                status:
                    updated.device.status,
                name:
                    updated.name,

                deviceModel: {
                    id:
                        updated.device.deviceModel.id,
                    name:
                        updated.device.deviceModel.name,
                    code:
                        updated.device.deviceModel.code
                }
            }
        });

    } catch (error) {

        console.error(
            "updateMyDeviceName:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update device name"
        });
    }
}