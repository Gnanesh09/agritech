import { Router } from "express";
import * as authController from "../controllers/auth.controller";

const authRouter = Router();

/**
 * POST /api/auth/register
 */
authRouter.post("/register", authController.register);

/**
 * POST /api/auth/login
 */
authRouter.post("/login", authController.login);

/**
 * GET /api/auth/get-me
 */
authRouter.get("/get-me", authController.getMe);

/**
 * GET /api/auth/refresh-token
 */
authRouter.get("/refresh-token", authController.refreshToken);

/**
 * GET /api/auth/logout
 * Note: POST is generally preferred for logout to prevent CSRF, but GET works here.
 */
authRouter.get("/logout", authController.logout);

/**
 * GET /api/auth/logout-all
 */
authRouter.get("/logout-all", authController.logoutAll);

/**
 * POST /api/auth/verify-email
 * FIXED: Changed to POST because the controller reads from req.body
 */
authRouter.post("/verify-email", authController.verifyEmail);

export default authRouter;