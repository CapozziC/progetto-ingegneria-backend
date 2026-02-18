import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { Payload } from "../types/auth.type.js";
import { deleteRefreshTokenBySubject } from "../repositories/refreshToken.repository.js";
import { InvalidTokenError, ExpiredTokenError } from "./error.utils.js";
import { Type } from "../entities/refreshToken.js";
import { Response } from "express";

/**
 * Generate a JWT access token with the given payload, secret and expiration time. The payload should contain the necessary information to identify the subject of the token (e.g. agent ID or account ID) and the type of subject (e.g. agent or account). The secret is used to sign the token and should be kept secure. The expiresIn parameter specifies how long the token is valid for (e.g. "10m" for 10 minutes).
 * @param payload The payload to include in the token, containing the subject ID and type
 * @param secret The secret key used to sign the token
 * @param expiresIn The expiration time for the token (e.g. "10m" for 10 minutes)
 * @returns A signed JWT access token as a string
 */
export const generateAccessToken = (
  payload: Payload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Generate a JWT refresh token with the given payload, secret and expiration time. The payload should contain the necessary information to identify the subject of the token (e.g. agent ID or account ID) and the type of subject (e.g. agent or account). The secret is used to sign the token and should be kept secure. The expiresIn parameter specifies how long the token is valid for (e.g. "7d" for 7 days).
 * @param payload The payload to include in the token, containing the subject ID and type
 * @param secret The secret key used to sign the token
 * @param expiresIn The expiration time for the token (e.g. "7d" for 7 days)
 * @returns A signed JWT refresh token as a string
 */
export const generateRefreshToken = (
  payload: Payload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

/** Verify the validity of a JWT access token and return its payload if valid. If the token is missing, invalid or expired, an appropriate error is thrown. The function uses the secret key to verify the token's signature and ensure its integrity.
 * @param accessToken The JWT access token to verify
 * @returns The payload contained in the access token if it is valid
 * @throws InvalidTokenError if the token is missing or invalid, ExpiredTokenError if the token has expired
 */
export const verifyAccessToken = (accessToken: string): Payload => {
  if (!accessToken) {
    throw new InvalidTokenError("access");
  }

  try {
    return jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET as Secret,
    ) as Payload;
  } catch (err) {
    if (String(err) === "TokenExpiredError") {
      throw new ExpiredTokenError("access", err);
    }
    throw new InvalidTokenError("access", err);
  }
};

/**
 * Verify the validity of a JWT refresh token and return its payload if valid. If the token is missing, invalid or expired, an appropriate error is thrown. The function uses the secret key to verify the token's signature and ensure its integrity.
 * @param refreshToken The JWT refresh token to verify
 * @returns The payload contained in the refresh token if it is valid
 * @throws InvalidTokenError if the token is missing or invalid, ExpiredTokenError if the token has expired
 */
export const verifyRefreshToken = (refreshToken: string): Payload => {
  if (!refreshToken) {
    throw new InvalidTokenError("refresh");
  }

  try {
    return jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as Secret,
    ) as Payload;
  } catch (err) {
    if (String(err) === "TokenExpiredError") {
      throw new ExpiredTokenError("refresh", err);
    }
    throw new InvalidTokenError("refresh", err);
  }
};

/**
 *  Revoke a refresh token for a specific subject (agent or account) by deleting it from the database. This function is typically called during logout to ensure that the refresh token can no longer be used to obtain new access tokens. If the revocation process fails, an error is logged and an exception is thrown.
 * @param subjectId The unique identifier of the subject (agent or account) for whom to revoke the refresh token
 * @param type The type of subject (agent or account) for whom to revoke the refresh token
 * @returns A Promise that resolves when the revocation process is complete
 * @throws An error if the revocation process fails
 */
export const revokeRefreshToken = async (
  subjectId: number,
  type: Type,
): Promise<void> => {
  try {
    await deleteRefreshTokenBySubject(subjectId, type);
  } catch (error) {
    console.error(
      `Failed to revoke refresh token for subject ${subjectId}  ${type} `,
      error,
    );
    throw new Error("Failed to revoke refresh token");
  }
};

/**
 *  Hash a refresh token using SHA-256 algorithm. This function takes a refresh token as input and returns its hashed value as a hexadecimal string. Hashing the refresh token adds an extra layer of security by ensuring that the actual token value is not stored in the database, making it more difficult for attackers to misuse stolen tokens.
 * @param token The refresh token to be hashed
 * @returns  A hexadecimal string representing the hashed value of the refresh token
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Set the access token and refresh token as httpOnly cookies in the response. The access token cookie is set to expire in 15 minutes, while the refresh token cookie is set to expire in 7 days. Both cookies are marked as httpOnly to prevent client-side scripts from accessing them, and they are configured to be secure and have a sameSite policy of "strict" to enhance security.
 * @param res The Express response object used to set the cookies
 * @param accessToken The JWT access token to be set as a cookie
 * @param refreshToken The JWT refresh token to be set as a cookie
 */
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear the access token and refresh token cookies from the response.
 * @param res The Express response object from which to clear the cookies
 */
export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
};
