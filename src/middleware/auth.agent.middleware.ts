import { NextFunction, Response } from "express";
import {
  findAgentById,
  findAgentAuthById,
} from "../repositories/agent.repository.js";
import {
  findRefreshTokenBySubject,
  createRefreshToken,
  saveRefreshToken,
} from "../repositories/refreshToken.repository.js";
import { Type } from "../entities/refreshToken.js";
import { RequestAgent } from "../types/express.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "../utils/auth.utils.js";
import { ExpiredTokenError, InvalidTokenError } from "../utils/error.utils.js";

/**
 * Agent authentication middleware.
 *
 * Validates the `accessToken` when present; if it is expired or missing,
 * attempts refresh using `refreshToken`, rotating and persisting it in the DB.
 * Sets `req.agent` and calls `next()` when the session is valid.
 *
 * @param req Express request with an optional authenticated `agent`.
 * @param res Express response used to send errors or updated cookies.
 * @param next Callback to pass control to the next middleware.
 * @returns Promise<void> or an HTTP response on error.
 */
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
        clearAuthCookies(res);
        return res.status(403).json({ error: "Forbidden" });
      }
      const agent = await findAgentAuthById(payload.subjectId);
      if (!agent) return res.status(401).json({ error: "Agent not found" });

      req.agent = agent;
      return next();
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Invalid access token" });
      }
      if (err instanceof ExpiredTokenError) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Access token expired" });
      }
    }
  }

  // 2) Refresh flow (access token assente o scaduto)
  try {
    const payload = verifyRefreshToken(refreshToken);

    // ✅ Questo middleware è per AGENT
    if (payload.type !== Type.AGENT) {
      clearAuthCookies(res);
      return res.status(403).json({ error: "Forbidden" });
    }

    const storedToken = await findRefreshTokenBySubject(
      payload.subjectId,
      payload.type,
    );
    if (!storedToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token not found" });
    }

    // hash match
    const incomingHash = hashRefreshToken(refreshToken);
    if (storedToken.id !== incomingHash) {
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token mismatch" });
    }

    // scadenza server-side
    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token expired" });
    }

    const agent = await findAgentById(payload.subjectId);
    if (!agent) {
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res.status(401).json({ error: "User not found" });
    }
    // ROTATION: revoco quello vecchio e genero nuovi token
    await revokeRefreshToken(payload.subjectId, payload.type);

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

    setAuthCookies(res, newAccessToken, newRefreshToken);
    req.agent = agent;
    return next();
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid refresh token", cause: err });
  }
};

export const authAgentFirstLoginOnly = async (
  req: RequestAgent,
  res: Response,
  next: NextFunction,
) => {
  const accessToken = req.cookies?.accessToken as string | undefined;
  console.log("Access token:", accessToken);
  if (!accessToken)
    return res.status(401).json({ error: "Missing access token" });

  try {
    const payload = verifyAccessToken(accessToken);

    if (payload.type !== Type.AGENT) {
      res.clearCookie("accessToken");
      return res.status(403).json({ error: "Forbidden" });
    }

    const agent = await findAgentById(payload.subjectId);
    if (!agent) return res.status(401).json({ error: "Agent not found" });

    if (agent.isPasswordChange) {
      return res.status(403).json({ error: "Password change not required" });
    }

    req.agent = agent;
    return next();
  } catch (err) {
    if (err instanceof InvalidTokenError)
      return res.status(401).json({ error: "Invalid access token" });
    if (err instanceof ExpiredTokenError)
      return res.status(401).json({ error: "Access token expired" });
    return res.status(401).json({ error: "Unauthorized" });
  }
};
