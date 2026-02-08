import { findAccountById } from "../repositories/account.repository.js";
import { Response, NextFunction } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  hashRefreshToken,
} from "../utils/auth.utils.js";
import {
  findRefreshTokenBySubject,
  saveRefreshToken,
  createRefreshToken,
} from "../repositories/refreshToken.repository.js";
import { InvalidTokenError, ExpiredTokenError } from "../utils/error.utils.js";
import { Type } from "../entities/refreshToken.js";
import { RequestAccount } from "../types/express.js";

export const authenticationMiddlewareAccount = async (
  req: RequestAccount,
  res: Response,
  next: NextFunction,
) => {
  const accessToken = req.cookies?.accessToken as string | undefined;
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (!refreshToken) {
    return res.status(401).json({ error: "Missing refresh token" });
  }

  // 1) Provo access token
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);

      // ✅ Questo middleware è per ACCOUNT
      if (payload.type !== Type.ACCOUNT) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(403).json({ error: "Forbidden" });
      }

      const account = await findAccountById(payload.subjectId);
      if (!account){
        res.clearCookie("accessToken")
        res.clearCookie("refreshToken")
      return res.status(401).json({ error: "User not found" });
      }
      req.account = account;
      return next();
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({ error: "Invalid access token" });
      }
      if (err instanceof ExpiredTokenError) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({ error: "Access token expired" });
        // se scaduto -> continuo al refresh flow
      }
    }

    // 2) Refresh flow (access token assente o scaduto)
    try {
      const payload = verifyRefreshToken(refreshToken);

      // ✅ Questo middleware è per ACCOUNT
      if (payload.type !== Type.ACCOUNT) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(403).json({ error: "Forbidden" });
      }

      const storedToken = await findRefreshTokenBySubject(
        payload.subjectId,
        payload.type,
      );
      if (!storedToken) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({ error: "Refresh token not found" });
      }

      // hash match
      const incomingHash = hashRefreshToken(refreshToken);
      if (storedToken.id !== incomingHash) {
        await revokeRefreshToken(payload.subjectId,payload.type);
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({ error: "Refresh token mismatch" });
      }

      // scadenza server-side
      if (storedToken.expiresAt.getTime() <= Date.now()) {
        await revokeRefreshToken(payload.subjectId,payload.type);
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({ error: "Refresh token expired" });
      }

      const account = await findAccountById(payload.subjectId);
      if (!account) {
        await revokeRefreshToken(payload.subjectId,payload.type);
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({ error: "User not found" });
      }

      // ROTATION: revoco quello vecchio e genero nuovi token
      await revokeRefreshToken(payload.subjectId,payload.type
        );

      
      const newAccessToken = generateAccessToken(
        { subjectId: account.id, type: Type.ACCOUNT },
        process.env.ACCESS_TOKEN_SECRET!,
        "15m",
      );

      const newRefreshToken = generateRefreshToken(
        { subjectId: account.id, type: Type.ACCOUNT },
        process.env.REFRESH_TOKEN_SECRET!,
        "7d",
      );

      const hashedNewRefreshToken = hashRefreshToken(newRefreshToken);

      
      const refreshTokenEntry = createRefreshToken({
        subjectId: account.id,
        id: hashedNewRefreshToken,
        type: Type.ACCOUNT,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await saveRefreshToken(refreshTokenEntry);

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      req.account = account;
      return next();
    } catch (err) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res
        .status(401)
        .json({ error: "Invalid refresh token", cause: err });
    }
  }
};
