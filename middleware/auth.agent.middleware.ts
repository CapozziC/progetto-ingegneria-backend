import { NextFunction, Response } from "express";
import {
    findAgentById,
  } from "../db/repositories/agent.repository.js";
  import {
    findRefreshTokenBySubject,
    createRefreshToken,
    saveRefreshToken,
  } from "../db/repositories/refreshToken.repository.js";
  import { revokeRefreshToken } from "../utils/auth.utils.js";
  import { Type } from "../db/entities/refreshToken.js";
  import { RequestAgent } from "../types/express.js";
  import {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
  } from "../utils/auth.utils.js";
  import { ExpiredTokenError,InvalidTokenError } from "../utils/error.utils.js";

  
export const authenticationMiddlewareAgent = async (
    req: RequestAgent,
    res: Response,
    next: NextFunction,
  ) => {
    const accessToken = req.cookies?.accessToken as string;
    const refreshToken = req.cookies?.refreshToken as string;
    if (!refreshToken) {
      return res.status(401).json({ error: "Missing refresh token" });
    }
  
    // 1) Provo access token
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        // ✅ Questo middleware è per AGENT
        if (payload.type !== Type.AGENT) {
          res.clearCookie("accessToken");
          res.clearCookie("refreshToken");
          return res.status(403).json({ error: "Forbidden" });
        }
        const agent = await findAgentById(payload.subjectId);
        if (!agent) return res.status(401).json({ error: "User not found" });
  
        req.agent = agent;
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
  
        // ✅ Questo middleware è per AGENT
        if (payload.type !== Type.AGENT) {
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
  
        const agent = await findAgentById(payload.subjectId);
        if (!agent) {
          await revokeRefreshToken(payload.subjectId,payload
            .type);
          res.clearCookie("accessToken");
          res.clearCookie("refreshToken");
          return res.status(401).json({ error: "User not found" });
        }
        // ROTATION: revoco quello vecchio e genero nuovi token
        await revokeRefreshToken(payload.subjectId,payload.type);
  
        const newAccessToken = generateAccessToken(
          { subjectId: agent.id, type: Type.AGENT },
          process.env.ACCESS_TOKEN_SECRET!,
          "15m",
        );
        const newRefreshToken = generateRefreshToken(
          { subjectId: agent.id, type: Type.AGENT },
          process.env.REFRESH_TOKEN_SECRET!,
          "7d",
        );
        const hashedNewRefreshToken = hashRefreshToken(newRefreshToken);
  
        const refreshTokenEntry = createRefreshToken({
          subjectId: agent.id,
          id: hashedNewRefreshToken,
          type: Type.AGENT,
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
  
        req.agent = agent;
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
  