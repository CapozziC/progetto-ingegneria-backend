import { Request, Response } from "express";

import { AppDataSource } from "../data-source.js";
import { Account, Provider } from "../entities/account.js";
import { verifyGoogleToken } from "../services/google/google.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/auth.utils.js";
import { Type } from "../entities/refreshToken.js";
import { setAuthCookies } from "../utils/cookie.utils.js";
import {
  createRefreshToken,
  saveRefreshToken,
} from "../repositories/refreshToken.repository.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error("Missing token secrets in environment variables");
}

export const googleAuthAccount = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token?: string };

    if (typeof token !== "string" || !token) {
      return res.status(400).json({ error: "Google token is required" });
    }

    const googleData = await verifyGoogleToken(token);
    const accountRepository = AppDataSource.getRepository(Account);

    let account: Account | null = await accountRepository.findOne({
      where: {
        provider: Provider.GOOGLE,
        providerAccountId: googleData.providerAccountId,
      },
    });

    if (account == null && googleData.email) {
      account = await accountRepository.findOne({
        where: { email: googleData.email },
      });
    }

    const isNewAccount = account == null;

    if (isNewAccount) {
      account = accountRepository.create({
        firstName: googleData.firstName,
        lastName: googleData.lastName,
        email: googleData.email,
        password: null,
        provider: Provider.GOOGLE,
        providerAccountId: googleData.providerAccountId,
      });
    } else if (account !== null) {
      if (account.provider == null && account.providerAccountId == null) {
        account.provider = Provider.GOOGLE;
        account.providerAccountId = googleData.providerAccountId;
      }

      if (account.email == null && googleData.email) {
        account.email = googleData.email;
      }

      if (!account.firstName && googleData.firstName) {
        account.firstName = googleData.firstName;
      }

      if (!account.lastName && googleData.lastName) {
        account.lastName = googleData.lastName;
      }
    }

    const savedAccount = await accountRepository.save(account!);

    const accessToken = generateAccessToken(
      { subjectId: savedAccount.id, type: Type.ACCOUNT },
      ACCESS_TOKEN_SECRET,
      "20m",
    );

    if (!accessToken) {
      return res.status(500).json({ error: "Token generation failed" });
    }

    const refreshToken = generateRefreshToken(
      { subjectId: savedAccount.id, type: Type.ACCOUNT },
      REFRESH_TOKEN_SECRET,
      "7d",
    );
    const hashedRefreshToken = hashRefreshToken(refreshToken);

    if (!hashedRefreshToken) {
      return res.status(500).json({ error: "Refresh token hashing failed" });
    }
    const refreshTokenEntry = createRefreshToken({
      id: hashedRefreshToken,
      subjectId: savedAccount.id,
      type: Type.ACCOUNT,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    });
    const savedRefreshToken = await saveRefreshToken(refreshTokenEntry);

    if (!savedRefreshToken) {
      return res.status(500).json({ error: "Saving refresh token failed" });
    }
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: isNewAccount
        ? "Google registration successful"
        : "Google login successful",
      account: {
        id: savedAccount.id,
        firstName: savedAccount.firstName,
        lastName: savedAccount.lastName,
        email: savedAccount.email,
      },
    });
  } catch (error) {
    console.error("googleAuthAccount error:", error);
    return res.status(401).json({
      error: "Invalid Google authentication",
    });
  }
};
