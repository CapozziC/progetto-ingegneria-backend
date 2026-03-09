import { NextFunction, Response } from "express";
import { findAgentById } from "../repositories/agent.repository.js";
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
  console.log("SONO ENTRATO NEL MIDDLEWARE AGENT");
  console.log("cookies:", req.cookies);
  const accessToken = req.cookies?.accessToken as string | undefined;
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  // 1) Provo access token
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);

      // ✅ Questo middleware è per AGENT
      if (payload.type !== Type.AGENT) {
        clearAuthCookies(res);
        return res.status(403).json({ error: "Forbidden" });
      }

      const agent = await findAgentById(payload.subjectId);
      if (!agent) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "User not found" });
      }
      req.agent = agent;
      return next();
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        res.clearCookie("accessToken");
      }
      if (err instanceof ExpiredTokenError) {
        res.clearCookie("accessToken");
        // se scaduto -> continuo al refresh flow
      }
    }
  }

  // 2) Refresh flow (access token assente o scaduto)
  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Refresh token missing" });
  }
  try {
    console.log("Faccio il refresh flow");
    const payload = verifyRefreshToken(refreshToken);

    // Questo middleware è per AGENT
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
      return res.status(401).json({ error: "Agent not found" });
    }

    // ROTATION: revoco quello vecchio e genero nuovi token
    await revokeRefreshToken(payload.subjectId, payload.type);

    const newAccessToken = generateAccessToken(
      { subjectId: agent.id, type: Type.AGENT },
      process.env.ACCESS_TOKEN_SECRET!,
      "3m",
    );

    const newRefreshToken = generateRefreshToken(
      { subjectId: agent.id, type: Type.AGENT },
      process.env.REFRESH_TOKEN_SECRET!,
      "5m",
    );

    const hashedNewRefreshToken = hashRefreshToken(newRefreshToken);

    const refreshTokenEntry = createRefreshToken({
      subjectId: agent.id,
      id: hashedNewRefreshToken,
      type: Type.AGENT,
      expiresAt: new Date(Date.now() + 5  * 60 * 1000),
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

/**
 * Login an agent by validating credentials, generating access and refresh tokens,
 * revoking old refresh tokens, saving the new refresh token in the DB, and setting cookies.
 * @param req Request with agent credentials in req.body
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 */
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
    if (err instanceof InvalidTokenError) clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid access token" });

    if (err instanceof ExpiredTokenError) clearAuthCookies(res);
    return res.status(401).json({ error: "Access token expired" });
    return res.status(401).json({ error: "Unauthorized" });
  }
};
