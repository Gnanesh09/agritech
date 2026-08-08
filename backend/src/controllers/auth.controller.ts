// controllers/auth.controller.ts
import type { Request, Response } from 'express';
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config";
import { prisma } from "../lib/prisma"; // Your Prisma connection
import { sendEmail } from "../services/email.service";
import { getOtpHtml, generateOtp } from "../utils/utils";

// Cookie options for secure storage
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // false in dev, true in prod
    sameSite: "lax" as const, // 'lax' is best for smooth local testing and most Next.js apps
};

// Define an interface for your JWT payload
interface JwtPayload {
    id: string;
    sessionId?: string;
}

export async function register(req: Request, res: Response) {
  try {
    // ---------------------------------------------------------
    // GET DATA FROM FRONTEND
    // ---------------------------------------------------------

    const {
      username,
      email,
      password,
      countryCode,
      phoneNo,
      role,
    } = req.body;

    console.log("========== REGISTER ==========");
console.log("Request role:", role);
console.log("Request body:", req.body);

    // ---------------------------------------------------------
    // VALIDATE ROLE
    // ---------------------------------------------------------

    if (
      role !== "USER" &&
      role !== "ADMIN" &&
      role !== "SUPER_ADMIN"
    ) {
      return res.status(400).json({
        message: "Invalid account role",
      });
    }

    // ---------------------------------------------------------
    // CHECK EXISTING USER
    // ---------------------------------------------------------

    const isAlreadyRegistered =
      await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email },
          ],
        },
      });

    if (isAlreadyRegistered) {
      return res.status(409).json({
        message: "Username or email already exists",
      });
    }

    // ---------------------------------------------------------
    // HASH PASSWORD
    // ---------------------------------------------------------

    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // ---------------------------------------------------------
    // CREATE USER
    // ---------------------------------------------------------

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        countryCode,
        phoneNo,
        role,
      },
    });

    console.log("Created user:", user);
console.log("Created user role:", user.role);

    // ---------------------------------------------------------
    // GENERATE OTP
    // ---------------------------------------------------------

    const otp = generateOtp();

    const html = getOtpHtml(otp);

    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // ---------------------------------------------------------
    // SAVE OTP
    // ---------------------------------------------------------

    await prisma.otp.create({
      data: {
        email,
        userId: user.id,
        otpHash,
      },
    });

    // ---------------------------------------------------------
    // SEND OTP EMAIL
    // ---------------------------------------------------------

    await sendEmail(
      email,
      "OTP Verification",
      `Your OTP code is ${otp}`,
      html
    );

    // ---------------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------------

    return res.status(201).json({
      message: "User registered successfully",

      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Registration failed",
    });
  }
}


export async function login(req: Request, res: Response) {
    const { email, password } = req.body;

    // Prisma: Find strictly by unique email
    const user = await prisma.user.findUnique({ 
        where: { email } 
    });

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    if (!user.verified) {
        return res.status(401).json({
            message: "Email not verified"
        });
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
    const isPasswordValid = hashedPassword === user.password;

    if (!isPasswordValid) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const refreshToken = jwt.sign(
        { id: user.id }, 
        config.JWT_SECRET,
        { expiresIn: "7d" }
    );

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // Prisma: Create new session
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            refreshTokenHash,
            ip: req.ip || "unknown",
            userAgent: req.headers["user-agent"] || "unknown"
        }
    });

    const accessToken = jwt.sign(
        { id: user.id, sessionId: session.id }, 
        config.JWT_SECRET,
        { expiresIn: "15m" }
    );

    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
    message: "Logged in successfully",
    user: {
        id: user.id,
        username: user.username,
        email: user.email,
        verified: user.verified,
        role: user.role,
    },
    accessToken,
});
}

export async function getMe(req: Request, res: Response) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token not found"
        });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

        // Prisma: Find by ID
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User fetched successfully",
            user: {
                username: user.username,
                email: user.email,
            }
        });
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

export async function refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "Refresh token not found"
        });
    }

    try {
        const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as JwtPayload;

        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        // Prisma: Find valid active session
        const session = await prisma.session.findFirst({
            where: {
                refreshTokenHash,
                revoked: false
            }
        });

        if (!session) {
            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        const accessToken = jwt.sign(
            { id: decoded.id }, 
            config.JWT_SECRET,
            { expiresIn: "15m" }
        );

        const newRefreshToken = jwt.sign(
            { id: decoded.id }, 
            config.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

        // Prisma: Update session with new hash
        await prisma.session.update({
            where: { id: session.id },
            data: { refreshTokenHash: newRefreshTokenHash }
        });

        res.cookie("refreshToken", newRefreshToken, {
           ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            message: "Access token refreshed successfully",
            accessToken
        });
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
    }
}

export async function logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        res.clearCookie("refreshToken", cookieOptions);
        return res.status(200).json({ message: "Already logged out" });
    }

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // Prisma: Find session
    const session = await prisma.session.findFirst({
        where: {
            refreshTokenHash,
            revoked: false
        }
    });

    if (!session) {
        res.clearCookie("refreshToken", cookieOptions);
        return res.status(200).json({ message: "Already logged out" });
    }

    // Prisma: Revoke session
    await prisma.session.update({
        where: { id: session.id },
        data: { revoked: true }
    });

    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).json({
        message: "Logged out successfully"
    });
}

export async function logoutAll(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        res.clearCookie("refreshToken", cookieOptions);
        return res.status(200).json({ message: "Already logged out" });
    }

    try {
        const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as JwtPayload;

        // Prisma: Bulk update many sessions
        await prisma.session.updateMany({
            where: {
                userId: decoded.id,
                revoked: false
            }, 
            data: {
                revoked: true
            }
        });

        res.clearCookie("refreshToken", cookieOptions);

        res.status(200).json({
            message: "Logged out from all devices successfully"
        });
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
export async function verifyEmail(req: Request, res: Response) {
    const { otp, email } = req.body;

    const otpHash = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    // Find OTP
    const otpDoc = await prisma.otp.findFirst({
        where: {
            email,
            otpHash,
        },
    });

    if (!otpDoc) {
        return res.status(400).json({
            message: "Invalid OTP",
        });
    }

    // Update user verification status
    const user = await prisma.user.update({
        where: {
            id: otpDoc.userId,
        },
        data: {
            verified: true,
        },
    });

    if (!user) {
        return res.status(404).json({
            message: "User not found",
        });
    }

    // Delete used OTP
    await prisma.otp.deleteMany({
        where: {
            userId: otpDoc.userId,
        },
    });

    // ---------------------------------------------------------
    // LOG THE USER IN AFTER SUCCESSFUL VERIFICATION
    // ---------------------------------------------------------

    const refreshToken = jwt.sign(
        { id: user.id },
        config.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );

    const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    // Create authenticated session
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            refreshTokenHash,
            ip: req.ip || "unknown",
            userAgent:
                req.headers["user-agent"] || "unknown",
        },
    });

    // Create access token
    const accessToken = jwt.sign(
        {
            id: user.id,
            sessionId: session.id,
        },
        config.JWT_SECRET,
        {
            expiresIn: "15m",
        }
    );

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ---------------------------------------------------------
    // IMPORTANT: RETURN ROLE
    // ---------------------------------------------------------

    return res.status(200).json({
        message: "Email verified and logged in successfully",

        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            verified: user.verified,
            role: user.role, // ⭐ THIS IS THE FIX
        },

        accessToken,
    });
}