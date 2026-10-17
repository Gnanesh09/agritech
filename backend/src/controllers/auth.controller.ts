// controllers/auth.controller.ts
import type { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config";
import { prisma } from "../lib/prisma"; // Your Prisma connection
import {
  sendOtpEmail,
  sendPasswordResetCodeEmail,
} from "../services/email.service";
import { generateOtp } from "../utils/utils";

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
    const { username, email, password, countryCode, phoneNo } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof countryCode !== "string" ||
      typeof phoneNo !== "string"
    ) {
      return res.status(400).json({ message: "Invalid registration data" });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCountryCode = countryCode.trim();
    const cleanPhoneNo = phoneNo.trim();

    if (
      !cleanUsername ||
      !cleanEmail ||
      !password ||
      !cleanCountryCode ||
      !cleanPhoneNo
    ) {
      return res.status(400).json({ message: "Please fill in all fields." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    // Check email and username independently so a pending, unverified signup can retry.
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    const existingUsernameUser = await prisma.user.findFirst({
      where: { username: cleanUsername },
    });

    if (
      existingUsernameUser &&
      existingUsernameUser.id !== existingEmailUser?.id
    ) {
      return res.status(409).json({ message: "Username already exists." });
    }

    if (existingEmailUser?.verified) {
      return res.status(409).json({
        message: "Email already exists. Please log in instead.",
        code: "EMAIL_ALREADY_VERIFIED",
      });
    }

    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Reuse an unverified account on retry; otherwise create a new unverified account.
    // Never accept ADMIN/SUPER_ADMIN from a public signup request.
    const user = existingEmailUser
      ? await prisma.user.update({
          where: { id: existingEmailUser.id },
          data: {
            username: cleanUsername,
            password: hashedPassword,
            countryCode: cleanCountryCode,
            phoneNo: cleanPhoneNo,
          },
        })
      : await prisma.user.create({
          data: {
            username: cleanUsername,
            email: cleanEmail,
            password: hashedPassword,
            countryCode: cleanCountryCode,
            phoneNo: cleanPhoneNo,
            role: "USER",
            verified: false,
          },
        });

    // Invalidate any older code so only the latest OTP works.
    await prisma.otp.deleteMany({ where: { userId: user.id } });

    const otp = String(generateOtp());
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await prisma.otp.create({
      data: {
        email: cleanEmail,
        userId: user.id,
        otpHash,
      },
    });

    try {
      await sendOtpEmail(cleanEmail, otp);
    } catch (emailError) {
      console.error("Verification email send failed:", emailError);
      return res.status(503).json({
        message:
          "Your account is saved, but the verification email could not be sent. Check the server email configuration, then submit signup again with the same email to resend the code.",
        code: "VERIFICATION_EMAIL_FAILED",
      });
    }

    return res.status(existingEmailUser ? 200 : 201).json({
      message: "Verification code sent. Check your email to continue.",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        countryCode: user.countryCode,
        phoneNo: user.phoneNo,
        role: user.role,
        verified: user.verified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res
      .status(500)
      .json({ message: "Registration failed. Please try again." });
  }
}

export async function login(req: Request, res: Response) {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const { password } = req.body;

  if (!email || typeof password !== "string") {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  // Normalize the email consistently with registration.
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  if (!user.verified) {
    return res.status(401).json({
      message: "Email not verified",
    });
  }

  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
  const isPasswordValid = hashedPassword === user.password;

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const refreshToken = jwt.sign({ id: user.id }, config.JWT_SECRET, {
    expiresIn: "7d",
  });

  const refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  // Prisma: Create new session
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      ip: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    },
  });

  const accessToken = jwt.sign(
    { id: user.id, sessionId: session.id },
    config.JWT_SECRET,
    { expiresIn: "15m" },
  );

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
      message: "Token not found",
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    // Prisma: Find by ID
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User fetched successfully",
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function refreshToken(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token not found",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as JwtPayload;

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    // Prisma: Find valid active session
    const session = await prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revoked: false,
      },
    });

    if (!session) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    const accessToken = jwt.sign({ id: decoded.id }, config.JWT_SECRET, {
      expiresIn: "15m",
    });

    const newRefreshToken = jwt.sign({ id: decoded.id }, config.JWT_SECRET, {
      expiresIn: "7d",
    });

    const newRefreshTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    // Prisma: Update session with new hash
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token" });
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.clearCookie("refreshToken", cookieOptions);
    return res.status(200).json({ message: "Already logged out" });
  }

  const refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  // Prisma: Find session
  const session = await prisma.session.findFirst({
    where: {
      refreshTokenHash,
      revoked: false,
    },
  });

  if (!session) {
    res.clearCookie("refreshToken", cookieOptions);
    return res.status(200).json({ message: "Already logged out" });
  }

  // Prisma: Revoke session
  await prisma.session.update({
    where: { id: session.id },
    data: { revoked: true },
  });

  res.clearCookie("refreshToken", cookieOptions);

  res.status(200).json({
    message: "Logged out successfully",
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
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });

    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).json({
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const otp =
      typeof req.body.otp === "string"
        ? req.body.otp.trim()
        : String(req.body.otp ?? "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpDoc = await prisma.otp.findFirst({
      where: { email, otpHash },
    });

    if (!otpDoc) {
      return res.status(400).json({
        message: "Invalid verification code. Request a new code and try again.",
      });
    }

    // The Prisma schema has createdAt, so enforce the 10-minute validity window here.
    const otpAgeMs = Date.now() - otpDoc.createdAt.getTime();
    if (otpAgeMs > 10 * 60 * 1000) {
      await prisma.otp.deleteMany({ where: { userId: otpDoc.userId } });
      return res.status(400).json({
        message:
          "This verification code has expired. Sign up again to receive a new one.",
      });
    }

    const user = await prisma.user.update({
      where: { id: otpDoc.userId },
      data: { verified: true },
    });

    // OTPs are single-use.
    await prisma.otp.deleteMany({ where: { userId: otpDoc.userId } });

    const refreshToken = jwt.sign({ id: user.id }, config.JWT_SECRET, {
      expiresIn: "7d",
    });
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ip: req.ip || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    });

    const accessToken = jwt.sign(
      { id: user.id, sessionId: session.id },
      config.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Email verified and logged in successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        verified: user.verified,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res
      .status(500)
      .json({ message: "Unable to verify email right now. Please try again." });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  // Use the same response for unknown and unverified accounts to reduce
  // account enumeration.
  const genericMessage =
    "If a verified account exists, a reset code has been sent to your email.";

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.verified) {
      return res.status(200).json({ message: genericMessage });
    }

    // Remove old codes for this account before issuing a new one.
    await prisma.otp.deleteMany({
      where: { email, userId: user.id },
    });

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const otpHash = crypto.createHash("sha256").update(code).digest("hex");

    await prisma.otp.create({
      data: {
        email,
        userId: user.id,
        otpHash,
      },
    });

    try {
      await sendPasswordResetCodeEmail(email, code);
    } catch (emailError) {
      // Do not leave a usable code behind if email delivery fails.
      await prisma.otp.deleteMany({ where: { email, userId: user.id } });
      console.error("Password reset email failed:", emailError);
      return res.status(503).json({
        message: "We couldn't send the reset email. Please try again.",
      });
    }

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      message: "Unable to process the reset request right now.",
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: "Enter the 6-digit reset code." });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Your new password must be at least 8 characters.",
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.verified) {
      return res.status(400).json({
        message: "The reset code is invalid or has expired. Request a new one.",
      });
    }

    // OTP records have no expiry column in the current Prisma schema.
    // Enforce a 10-minute validity window using createdAt.
    const otpRecord = await prisma.otp.findFirst({
      where: {
        email,
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    const submittedHash = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    if (
      !otpRecord ||
      otpRecord.otpHash.length !== submittedHash.length ||
      !crypto.timingSafeEqual(
        Buffer.from(otpRecord.otpHash, "hex"),
        Buffer.from(submittedHash, "hex"),
      )
    ) {
      return res.status(400).json({
        message: "The reset code is invalid or has expired. Request a new one.",
      });
    }

    // Keep this hashing consistent with the existing login controller.
    // For production, migrate password storage to Argon2id or bcrypt.
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.otp.deleteMany({
        where: { email, userId: user.id },
      }),
    ]);

    return res.status(200).json({
      message:
        "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      message: "Unable to reset your password right now.",
    });
  }
}
