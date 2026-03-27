import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source.js";
import { Account, Provider } from "../entities/account.js";
import { verifyGoogleToken } from "../services/google/google.service.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not configured");
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

    const appToken = jwt.sign(
      {
        subjectId: savedAccount.id,
        type: "account",
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      message: isNewAccount
        ? "Google registration successful"
        : "Google login successful",
      token: appToken,
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
