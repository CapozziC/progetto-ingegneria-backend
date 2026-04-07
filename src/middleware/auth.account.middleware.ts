import { findAccountById } from "../repositories/account.repository.js";
import { Response, NextFunction } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
} from "../utils/auth.utils.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookie.utils.js";
import {
  findRefreshTokenBySubject,
  saveRefreshToken,
  createRefreshToken,
} from "../repositories/refreshToken.repository.js";
import { InvalidTokenError, ExpiredTokenError } from "../utils/error.utils.js";
import { Type } from "../entities/refreshToken.js";
import { RequestAccount } from "../types/express.js";
import { revokeRefreshToken } from "../services/auth.service.js";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error("Missing token secrets in environment variables");
}
/**
 * Account authentication middleware.
 *
 * Validates the `accessToken` when present; if it is expired or missing,
 * attempts refresh using `refreshToken`, rotating and persisting it in the DB.
 * Sets `req.account` and calls `next()` when the session is valid.
 *
 * @param req Express request with an optional authenticated `account`.
 * @param res Express response used to send errors or updated cookies.
 * @param next Callback to pass control to the next middleware.
 * @returns Promise<void> or an HTTP response on error.
 */
export const authenticationMiddlewareAccount = async (
  req: RequestAccount,
  res: Response,
  next: NextFunction,
) => {
  console.log("SONO ENTRATO NEL MIDDLEWARE ACCOUNT");
  console.log("[REQ]", req.method, req.originalUrl);
  console.log("[REQ] origin:", req.headers.origin ?? "n/a");
  console.log("[REQ] referer:", req.headers.referer ?? "n/a");
  console.log("[0] Cookies ricevuti:", req.cookies);

  const accessToken = req.cookies?.accessToken as string | undefined;
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  // 1) Provo access token
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);

      // ✅ Questo middleware è per ACCOUNT
      if (payload.type !== Type.ACCOUNT) {
        clearAuthCookies(res);
        return res.status(403).json({ error: { message: "Forbidden" } });
      }

      const account = await findAccountById(payload.subjectId);
      if (!account) {
        clearAuthCookies(res);
        return res.status(401).json({ error: { message: "User not found" } });
      }
      req.account = account;
      return next();
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        clearAuthCookies(res);
      }
      if (err instanceof ExpiredTokenError) {
        clearAuthCookies(res);
        // se scaduto -> continuo al refresh flow
      }
    }
  }

  // 2) Refresh flow (access token assente o scaduto)
  if (!refreshToken) {
    clearAuthCookies(res);
    return res
      .status(401)
      .json({ error: { message: "Refresh token missing" } });
  }
  try {
    console.log("Faccio il refresh flow");
    const payload = verifyRefreshToken(refreshToken);

    // Questo middleware è per ACCOUNT
    if (payload.type !== Type.ACCOUNT) {
      clearAuthCookies(res);
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const storedToken = await findRefreshTokenBySubject(
      payload.subjectId,
      payload.type,
    );
    if (!storedToken) {
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ error: { message: "Refresh token not found" } });
    }

    // hash match
    const incomingHash = hashRefreshToken(refreshToken);
    if (storedToken.id !== incomingHash) {
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ error: { message: "Refresh token mismatch" } });
    }

    // scadenza server-side
    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ error: { message: "Refresh token expired" } });
    }

    const account = await findAccountById(payload.subjectId);
    if (!account) {
      await revokeRefreshToken(payload.subjectId, payload.type);
      clearAuthCookies(res);
      return res.status(401).json({ error: { message: "User not found" } });
    }

    // ROTATION: revoco quello vecchio e genero nuovi token
    console.log("Rotazione token in corso...");
    await revokeRefreshToken(payload.subjectId, payload.type);

    const newAccessToken = generateAccessToken(
      { subjectId: account.id, type: Type.ACCOUNT },
      ACCESS_TOKEN_SECRET,
      "20m",
    );

    const newRefreshToken = generateRefreshToken(
      { subjectId: account.id, type: Type.ACCOUNT },
      REFRESH_TOKEN_SECRET,
      "3d",
    );

    const hashedNewRefreshToken = hashRefreshToken(newRefreshToken);
    console.log(
      "Nuovi token generati, salvo il nuovo refresh token e aggiorno i cookie",
    );
    const refreshTokenEntry = createRefreshToken({
      subjectId: account.id,
      id: hashedNewRefreshToken,
      type: Type.ACCOUNT,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });

    await saveRefreshToken(refreshTokenEntry);

    setAuthCookies(res, newAccessToken, newRefreshToken);
    console.log("Token refresh riuscito, proseguo alla route protetta");

    req.account = account;
    return next();
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ error: "Invalid refresh token", cause: err });
  }
};
