import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { Type } from "../entities/refreshToken.js";
import { RequestWithResetToken } from "../types/auth.type.js";

export const verifyResetToken = (
  req: RequestWithResetToken,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.body ;

    if (!token) {
      return res.status(400).json({ error: { message: "Reset token is required" } });
    }

    const payload = jwt.verify(
      token,
      process.env.RESET_TOKEN_SECRET as string,
    ) as {
      subjectId: number;
      type: Type;
    };

    req.resetToken = payload;
    next();
  } catch (error) {
    console.error("Invalid reset token:", error);
    return res.status(401).json({
      error: { message: "Invalid or expired reset token" },
    });
  }
};
