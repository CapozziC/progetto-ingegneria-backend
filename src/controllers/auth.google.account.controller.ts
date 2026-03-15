import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source.js";
import { Account, Provider } from "../entities/account.js";
import { verifyGoogleToken } from "../services/google/google.service.js";

export const googleAuthAccount = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token?: string };

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Google token is required" });
    }

    const googleData = await verifyGoogleToken(token);

    const accountRepository = AppDataSource.getRepository(Account);

    let account = await accountRepository.findOne({
      where: {
        provider: Provider.GOOGLE,
        providerAccountId: googleData.providerAccountId,
      },
    });

    if (!account && googleData.email) {
      account = await accountRepository.findOne({
        where: { email: googleData.email },
      });
    }

    let isNewAccount = false;

    if (!account) {
      account = accountRepository.create({
        firstName: googleData.firstName,
        lastName: googleData.lastName,
        email: googleData.email,
        password: null,
        provider: Provider.GOOGLE,
        providerAccountId: googleData.providerAccountId,
      });

      await accountRepository.save(account);
      isNewAccount = true;
    } else {
      if (!account.provider && !account.providerAccountId) {
        account.provider = Provider.GOOGLE;
        account.providerAccountId = googleData.providerAccountId;
      }

      if (!account.email && googleData.email) {
        account.email = googleData.email;
      }

      if (!account.firstName && googleData.firstName) {
        account.firstName = googleData.firstName;
      }

      if (!account.lastName && googleData.lastName) {
        account.lastName = googleData.lastName;
      }

      await accountRepository.save(account);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET not configured");
    }

    const appToken = jwt.sign(
      {
        subjectId: account.id,
        type: "account",
      },
      secret,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      message: isNewAccount
        ? "Google registration successful"
        : "Google login successful",
      token: appToken,
      account: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
      },
    });
  } catch (error) {
    console.error("googleAuthAccount error:", error);
    return res.status(401).json({
      error: "Invalid Google authentication",
    });
  }
};