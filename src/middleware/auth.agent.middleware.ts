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
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
} from "../utils/auth.utils.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookie.utils.js";
import { revokeRefreshToken } from "../services/auth.service.js";
import { ExpiredTokenError, InvalidTokenError } from "../utils/error.utils.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error("Missing token secrets in environment variables");
}
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
  console.log("\n========== AUTH MIDDLEWARE AGENT ==========");
  console.log("[0] Cookies ricevuti:", req.cookies);

  const accessToken = req.cookies?.accessToken as string | undefined;
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  console.log("[1] AccessToken presente?", !!accessToken);
  console.log("[2] RefreshToken presente?", !!refreshToken);

  // =========================
  // 1) ACCESS TOKEN FLOW
  // =========================
  if (accessToken) {
    try {
      console.log("[3] Verifico access token...");
      const payload = verifyAccessToken(accessToken);
      console.log("[4] Payload access token:", payload);

      if (payload.type !== Type.AGENT) {
        console.log("[5] Tipo NON AGENT -> Forbidden");
        clearAuthCookies(res);
        return res.status(403).json({ error: { message: "Forbidden" } });
      }

      console.log("[6] Cerco agente con ID:", payload.subjectId);
      const agent = await findAgentById(payload.subjectId);

      if (!agent) {
        console.log("[7] Agente NON trovato");
        clearAuthCookies(res);
        return res.status(401).json({ error: { message: "Agent not found" } });
      }

      console.log("[8] Agente trovato:", agent.id);
      req.agent = agent;

      console.log("[9] ACCESS TOKEN valido -> next()");
      return next();
    } catch (err) {
      console.log("[10] Errore access token:", err);

      if (err instanceof InvalidTokenError) {
        console.log("[11] Access token INVALIDO");
        clearAuthCookies(res);
      }

      if (err instanceof ExpiredTokenError) {
        console.log("[12] Access token SCADUTO -> passo al refresh flow");
        clearAuthCookies(res);
      }
    }
  }

  // =========================
  // 2) REFRESH FLOW
  // =========================
  console.log("[13] Entro nel REFRESH FLOW");

  if (!refreshToken) {
    console.log("[14] Refresh token mancante");
    clearAuthCookies(res);
    return res
      .status(401)
      .json({ error: "Refresh token missing"  });
  }

  try {
    console.log("[15] Verifico refresh token...");
    const payload = verifyRefreshToken(refreshToken);
    console.log("[16] Payload refresh token:", payload);

    if (payload.type !== Type.AGENT) {
      console.log("[17] Tipo NON AGENT nel refresh");
      clearAuthCookies(res);
      return res.status(403).json({ error: "Forbidden"  });
    }

    console.log("[18] Cerco refresh token salvato...");
    const storedToken = await findRefreshTokenBySubject(
      payload.subjectId,
      payload.type,
    );

    if (!storedToken) {
      console.log("[19] Refresh token NON trovato nel DB");
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ error: { message: "Refresh token not found" } });
    }

    console.log("[20] Confronto hash refresh token...");
    const incomingHash = hashRefreshToken(refreshToken);

    if (storedToken.id !== incomingHash) {
      console.log("[21] HASH mismatch -> possibile furto token");
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token mismatch" });
    }

    console.log("[22] Controllo scadenza DB...");
    if (storedToken.expiresAt.getTime() <= Date.now()) {
      console.log("[23] Refresh token SCADUTO lato server");
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token expired" });
    }

    console.log("[24] Cerco agente...");
    const agent = await findAgentById(payload.subjectId);

    if (!agent) {
      console.log("[25] Agente NON trovato");
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res.status(401).json({ error: { message: "Agent not found" } });
    }

    console.log("[26] ROTATION token...");
    await revokeRefreshToken(payload.subjectId, payload.type);

    const newAccessToken = generateAccessToken(
      { subjectId: agent.id, type: Type.AGENT },
      ACCESS_TOKEN_SECRET,
      "20m",
    );

    const newRefreshToken = generateRefreshToken(
      { subjectId: agent.id, type: Type.AGENT },
      REFRESH_TOKEN_SECRET,
      "6d",
    );

    console.log("[27] Nuovi token generati");

    const hashedNewRefreshToken = hashRefreshToken(newRefreshToken);

    const refreshTokenEntry = createRefreshToken({
      subjectId: agent.id,
      id: hashedNewRefreshToken,
      type: Type.AGENT,
      expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    });

    await saveRefreshToken(refreshTokenEntry);
    console.log("[28] Nuovo refresh token salvato nel DB");

    setAuthCookies(res, newAccessToken, newRefreshToken);
    console.log("[29] Cookie aggiornati");

    req.agent = agent;
    console.log("[30] REFRESH FLOW completato -> next()");
    return next();
  } catch (err) {
    console.log("[31] Errore REFRESH FLOW:", err);
    clearAuthCookies(res);
    return res
      .status(401)
      .json({ error: "Invalid refresh token" , cause: err });
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

  if (!accessToken) {
    return res.status(401).json({ error: "Missing access token" });
  }

  try {
    const payload = verifyAccessToken(accessToken);

    if (payload.type !== Type.AGENT) {
      clearAuthCookies(res);
      return res.status(403).json({ error: "Forbidden" });
    }

    const agent = await findAgentById(payload.subjectId);
    if (!agent) {
      return res.status(401).json({ error: "Agent not found" });
    }

    if (agent.isPasswordChange) {
      return res.status(403).json({ error: "Password change not required" });
    }

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

    return res.status(401).json({ error: "Unauthorized" });
  }
};
