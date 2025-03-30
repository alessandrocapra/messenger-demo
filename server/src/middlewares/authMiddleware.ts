import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";
//
// Extended Express Request type for type safety
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

interface JwtPayload {
  userId: number;
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  if (!token) {
    res.status(401).json({ message: "Unauthorized" })
    return;
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined");
    res.status(500).json({ message: "Internal Server Error" })
    return;
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: {
        id: true,
        email: true
      }
    })

    if (!user) {
      res.status(401).json({ message: "User not found" })
      return;
    }

    req.user = user;
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token expired" });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
