import jwt, { Secret, SignOptions } from "jsonwebtoken";
import cripto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import { Payload } from "../types/auth.type.js";
import { deleteRefreshTokenBySubjectId } from "../db/repositories/refreshToken.repository.js";

// Generate Access and Refresh Tokens for Users
export const generateAccessToken = (
  payload: Payload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

export const generateRefreshToken = (
  payload: Payload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyAccessToken = (accessToken: string): Payload => {
  if (!accessToken) {
    throw new Error("Access token is required");
  }

  try {
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET as Secret,
    ) as Payload;

    return decoded;
  } catch (err) {
    throw new Error("Invalid access token", { cause: err });
  }
};

export const verifyRefreshToken = (refreshToken: string): Payload => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as Secret,
    ) as Payload;

    return decoded;
  } catch (err) {
    throw new Error("Invalid refresh token", { cause: err });
  }
};

export const revokeRefreshToken = async (subjectId: number): Promise<void> => {
  try {
    await deleteRefreshTokenBySubjectId(subjectId);
  } catch (error) {
    console.error(
      `Failed to revoke refresh token for subject ${subjectId}:`,
      error,
    );
    throw new Error("Failed to revoke refresh token");
  }
};

export const hashRefreshToken = (token: string): string => {
  return cripto.createHash("sha256").update(token).digest("hex");
};
