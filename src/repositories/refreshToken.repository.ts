import { AppDataSource } from "../data-source.js";
import { RefreshToken, Type } from "../entities/refreshToken.js";
export const RefreshTokenRepository = AppDataSource.getRepository(RefreshToken);

/** Create a new refresh token instance with the provided data. This function takes a partial refresh token object containing the necessary fields for refresh token creation and returns a new RefreshToken instance that can be saved to the database.
 * @param tokenData An object containing the fields required to create a new refresh token (e.g. subjectId, type, token)
 * @returns A new RefreshToken instance created with the provided data
 */
export const createRefreshToken = (
  tokenData: Partial<RefreshToken>,
): RefreshToken => {
  return RefreshTokenRepository.create(tokenData);
};

/**
 * Save a refresh token to the database. This function takes a RefreshToken object and saves it to the database using the RefreshTokenRepository. It returns a Promise that resolves to the saved RefreshToken object, which may include additional fields such as the generated ID.
 * @param token The RefreshToken object to save to the database
 * @returns A Promise that resolves to the saved RefreshToken object
 */
export const saveRefreshToken = async (
  token: RefreshToken,
): Promise<RefreshToken> => {
  return await RefreshTokenRepository.save(token);
};

/**
 *  Delete a refresh token by its subject identifier and type. This function takes the subject ID and type of the refresh token to be deleted, and removes the corresponding record from the database. It returns a Promise that resolves when the deletion is complete.
 * @param subjectId The unique identifier of the subject associated with the refresh token to delete
 * @param type The type of the refresh token to delete
 * @returns A Promise that resolves when the deletion is complete
 */
export const deleteRefreshTokenBySubject = async (
  subjectId: number,
  type: Type,
): Promise<void> => {
  await RefreshTokenRepository.delete({ subjectId, type });
};

/**
 *  Find a refresh token by its subject identifier and type. This function queries the database for a refresh token with the specified subject ID and type, and returns it if found. If no refresh token is found with the given criteria, it returns null.
 * @param subjectId The unique identifier of the subject associated with the refresh token to find
 * @param type The type of the refresh token to find
 * @returns A Promise that resolves to the RefreshToken object if found, or null if not found
 */
export const findRefreshTokenBySubject = async (
  subjectId: number,
  type: Type,
): Promise<RefreshToken | null> => {
  return await RefreshTokenRepository.findOne({ where: { subjectId, type } });
};
