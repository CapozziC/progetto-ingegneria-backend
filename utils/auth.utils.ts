import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import "dotenv/config";
import { Payload } from "../types/auth.type.js";
import { deleteRefreshTokenBySubject} from "../db/repositories/refreshToken.repository.js";
import { InvalidTokenError, ExpiredTokenError} from "./error.utils.js";
import { Type } from "../db/entities/refreshToken.js";

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
}



export const revokeRefreshToken = async (subjectId: number,type:Type): Promise<void> => {
  try {
    await deleteRefreshTokenBySubject(subjectId,type);
  } catch (error) {
    console.error(
      `Failed to revoke refresh token for subject ${subjectId}  ${type}:`,
      error,
    );
    throw new Error("Failed to revoke refresh token");
  }
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
