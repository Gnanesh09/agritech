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

        const devices = await prisma.device.findMany({
            where: {
                ownerId: req.userId
            },

            include: {
                deviceModel: true
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            devices
        });

    } catch (error) {
        console.error("getMyDevices:", error);

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

        const device =
            await prisma.device.findFirst({
                where: {
                    id,
                    ownerId: req.userId
                },

                include: {
                    deviceModel: true
                }
            });

        if (!device) {
            return res.status(404).json({
                message: "Device not found"
            });
        }

        return res.status(200).json({
            device
        });

    } catch (error) {
        console.error("getMyDevice:", error);

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

        // -----------------------------
        // Find available device
        // -----------------------------

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

        // -----------------------------
        // Claim device
        // -----------------------------

        const updatedDevice =
            await prisma.device.update({
                where: {
                    id: device.id
                },

                data: {
                    ownerId: req.userId,
                    status: "LINKED",
                    linkedAt: new Date()
                },

                include: {
                    deviceModel: true
                }
            });

        return res.status(200).json({
            message:
                "Device linked successfully",

            device: updatedDevice
        });

    } catch (error) {
        console.error("claimDevice:", error);

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

        // -----------------------------
        // Make sure this belongs to user
        // -----------------------------

        const device =
            await prisma.device.findFirst({
                where: {
                    id,
                    ownerId: req.userId
                }
            });

        if (!device) {
            return res.status(404).json({
                message:
                    "Device not found or does not belong to you"
            });
        }

        // -----------------------------
        // Unlink
        // -----------------------------

        const updatedDevice =
            await prisma.device.update({
                where: {
                    id
                },

                data: {
                    ownerId: null,
                    status: "AVAILABLE",
                    linkedAt: null
                }
            });

        return res.status(200).json({
            message:
                "Device unlinked successfully",

            device: updatedDevice
        });

    } catch (error) {
        console.error("unlinkDevice:", error);

        return res.status(500).json({
            message:
                "Failed to unlink device"
        });
    }
}