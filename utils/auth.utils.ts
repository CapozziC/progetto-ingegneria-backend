import jwt, { Secret, SignOptions } from "jsonwebtoken";
import cripto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import { Payload } from "../types/auth.type.js";
import { deleteRefreshTokenBySubject} from "../db/repositories/refreshToken.repository.js";
import { InvalidTokenError, ExpiredTokenError } from "./error.utils.js";
import { Type } from "../db/entities/refreshToken.js";
import { access } from "fs";
import { error } from "console";

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
    throw  new InvalidTokenError("access",error);
  }

  try {
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET as Secret,
    ) as Payload;

    return decoded;
  } catch (err) {
    throw  new ExpiredTokenError("access",err)
  }
};

export const verifyRefreshToken = (refreshToken: string): Payload => {
  if (!refreshToken) {
    throw new InvalidTokenError("refresh",error);;
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as Secret,
    ) as Payload;

    return decoded;
  } catch (err) {
    throw new ExpiredTokenError("refresh", err);
  }
};

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
  return cripto.createHash("sha256").update(token).digest("hex");
};
