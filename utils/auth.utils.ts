import jwt, { Secret, SignOptions, JwtPayload } from "jsonwebtoken";
import { Payload } from "../types/auth.type.js";

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

export const verifyToken = (
  token: string,
  secret: Secret,
): JwtPayload | string => {
  return jwt.verify(token, secret) as JwtPayload | string;
};
