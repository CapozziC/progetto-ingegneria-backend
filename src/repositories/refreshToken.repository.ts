import { AppDataSource } from "../../src/data-source.js";
import { RefreshToken, Type } from "../../src/entities/refreshToken.js";
export const RefreshTokenRepository = AppDataSource.getRepository(RefreshToken);

export const createRefreshToken = (
  tokenData: Partial<RefreshToken>,
): RefreshToken => {
  return RefreshTokenRepository.create(tokenData);
};

export const saveRefreshToken = async (
  token: RefreshToken,
): Promise<RefreshToken> => {
  return await RefreshTokenRepository.save(token);
};

export const deleteRefreshTokenBySubject = async (
  subjectId: number,
  type: Type,
): Promise<void> => {
  await RefreshTokenRepository.delete({ subjectId, type });
};

export const findRefreshTokenBySubject = async (
  subjectId: number,
  type: Type,
): Promise<RefreshToken | null> => {
  return await RefreshTokenRepository.findOne({ where: { subjectId, type } });
};
