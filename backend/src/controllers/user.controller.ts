// // controllers/auth.controller.ts
// import type { Request, Response } from 'express';
// import crypto from "crypto";
// import jwt from "jsonwebtoken";
// import config from "../config/config";
// import { prisma } from "../lib/prisma"; 
// import type { AuthRequest } from '../middleware/auth.middleware';



// export async function getMe(req: AuthRequest, res: Response) {
//     const token = req.headers.authorization?.split(" ")[1];

//     if (!token) {
//         return res.status(401).json({
//             message: "Token not found"
//         });
//     }

//     try {
//         const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

//         // Prisma: Find by ID
//         const user = await prisma.user.findUnique({
//             where: { id: decoded.id }
//         });

//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         res.status(200).json({
//             message: "User fetched successfully",
//             user: {
//                 username: user.username,
//                 email: user.email,
//             }
//         });
//     } catch (error) {
//         return res.status(401).json({ message: "Invalid or expired token" });
//     }
// }