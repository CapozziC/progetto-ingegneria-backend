import { deleteRefreshTokenBySubject } from "../repositories/refreshToken.repository.js";
import { Type } from "../entities/refreshToken.js";

/**
 * Revokes a refresh token in the database
 * @param subjectId The ID of the subject for whom to revoke the token
 * @param type The type of the token to revoke
 */
export const revokeRefreshToken = async (
  subjectId: number,
  type: Type,
): Promise<void> => {
  try {
    await deleteRefreshTokenBySubject(subjectId, type);
  } catch (error: unknown) {
    console.error(
      `Failed to revoke refresh token for subject ${subjectId} ${type}`,
      error,
    );
    throw new Error("Failed to revoke refresh token", { cause: error });
  }
};
