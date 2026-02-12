import crypto from "crypto";
/**
 * Generates a temporary password consisting of 16 hexadecimal characters (8 bytes).
 * @returns {string} A temporary password.
 */
export const generateTemporaryPassword = (): string => {
  return crypto.randomBytes(8).toString("hex");
};
