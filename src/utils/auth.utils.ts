import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { Payload } from "../types/auth.type.js";
import { deleteRefreshTokenBySubject } from "../repositories/refreshToken.repository.js";
import { InvalidTokenError, ExpiredTokenError } from "./error.utils.js";
import { Type } from "../entities/refreshToken.js";
import { Response } from "express";

const isProd = process.env.NODE_ENV === "production";

/**
 * Generates a JWT access token
 * @param payload The payload for the access token
 * @param secret The secret for signing the token
 * @param expiresIn The expiration time for the token
 * @returns JWT access token
 */
export const generateAccessToken = (
  payload: Payload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Generates a JWT refresh token
 * @param payload The payload for the refresh token
 * @param secret The secret for signing the token
 * @param expiresIn The expiration time for the token
 * @returns JWT refresh token
 */
export const generateRefreshToken = (
  payload: Payload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verifies a JWT access token
 * @param accessToken The access token to verify
 * @returns The verified payload if the token is valid
 * @throws InvalidTokenError if the token is invalid
 * @throws ExpiredTokenError if the token has expired
 */
export const verifyAccessToken = (accessToken: string): Payload => {
  if (!accessToken) throw new InvalidTokenError("access");

  try {
    return jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET as Secret) as Payload;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TokenExpiredError") throw new ExpiredTokenError("access", err);
    throw new InvalidTokenError("access", err);
  }
};

/**
 * Verifies a JWT refresh token
 * @param refreshToken The refresh token to verify
 * @returns The verified payload if the token is valid
 * @throws InvalidTokenError if the token is invalid
 * @throws ExpiredTokenError if the token has expired
 */
export const verifyRefreshToken = (refreshToken: string): Payload => {
  if (!refreshToken) throw new InvalidTokenError("refresh");

  try {
    return jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as Secret) as Payload;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TokenExpiredError") throw new ExpiredTokenError("refresh", err);
    throw new InvalidTokenError("refresh", err);
  }
};

/**
 * Revokes a refresh token in the database
 * @param subjectId The ID of the subject for whom to revoke the token
 * @param type The type of the token to revoke
 */
export const revokeRefreshToken = async (subjectId: number, type: Type): Promise<void> => {
  try {
    await deleteRefreshTokenBySubject(subjectId, type);
  } catch (error: unknown ) {
    console.error(`Failed to revoke refresh token for subject ${subjectId} ${type}`, error);
    throw new Error("Failed to revoke refresh token", { cause: error });
  }
};

/**
 * Hashes a refresh token using SHA-256
 * @param token The refresh token to hash
 * @returns The hashed token
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Sets authentication cookies for the user
 * @param res The response object
 * @param accessToken The access token to set
 * @param refreshToken The refresh token to set
 */
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  if (isProd) {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      maxAge: 20 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });
  } else {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 20 * 60 * 1000, 
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });
  }
};
/**
 * Sets a short-lived access token cookie for first login scenarios where password change is required
 * @param res The response object
 * @param accessToken The access token to set
 */
export const setFirstLoginAccessCookie = (
  res: Response,
  accessToken: string,
) => {
  if (isProd) {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      maxAge: 15 * 60 * 1000,
    });
  } else {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
  }
};

/**
 * Clears authentication cookies for the user
 * @param res The response object
 */
export const clearAuthCookies = (res: Response) => {
  if (isProd) {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      path: "/",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      path: "/",
    });
  } else {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  }
};