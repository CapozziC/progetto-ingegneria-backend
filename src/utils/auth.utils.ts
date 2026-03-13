import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { Payload } from "../types/auth.type.js";
import { InvalidTokenError, ExpiredTokenError } from "./error.utils.js";

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
 * Generates a JWT reset token for password reset
 * @param payload The payload for the reset token
 * @param secret The secret for signing the token
 * @param expiresIn The expiration time for the token
 * @returns JWT reset token 
 */
export const generateResetToken = (
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
    return jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET as Secret,
    ) as Payload;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TokenExpiredError")
      throw new ExpiredTokenError("access", err);
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
    return jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as Secret,
    ) as Payload;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TokenExpiredError")
      throw new ExpiredTokenError("refresh", err);
    throw new InvalidTokenError("refresh", err);
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
