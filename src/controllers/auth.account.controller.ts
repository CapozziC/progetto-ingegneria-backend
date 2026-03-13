import {
  findAccountByEmail,
  createAccount,
  saveAccount,
  findAccountById,
} from "../repositories/account.repository.js";
import {
  createRefreshToken,
  saveRefreshToken,
} from "../repositories/refreshToken.repository.js";
import { Response } from "express";
import { revokeRefreshToken } from "../services/auth.service.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookie.utils.js";

import bcrypt from "bcryptjs";
import { Type } from "../entities/refreshToken.js";
import { RequestAccount } from "../types/express.js";
import {
  hashRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
} from "../utils/auth.utils.js";
import { sendAccountForgotPasswordEmail } from "../services/nodemailer/accountForgotPassword.service.js";
import { RequestWithResetToken } from "../types/auth.type.js";

/**
 * Register a new account with the provided first name, last name, email and password. The password is hashed before saving. If registration is successful, an access token and a refresh token are generated and sent as httpOnly cookies.
 * @param req RequestAccount with body containing firstName, lastName, email and password for the new account to register
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 */
export const registerAccount = async (req: RequestAccount, res: Response) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "First name, last name, email and password are required",
      });
    }

    const existingAccount = await findAccountByEmail(email);

    if (existingAccount) {
      return res.status(409).json({ error: "Account already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAccount = createAccount({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    const savedAccount = await saveAccount(newAccount);

    const accessToken = generateAccessToken(
      { subjectId: savedAccount.id, type: Type.ACCOUNT },
      process.env.ACCESS_TOKEN_SECRET!,
      "20m",
    );

    const refreshToken = generateRefreshToken(
      { subjectId: savedAccount.id, type: Type.ACCOUNT },
      process.env.REFRESH_TOKEN_SECRET!,
      "5d",
    );

    if (!accessToken || !refreshToken) {
      return res.status(500).json({ error: "Token generation failed" });
    }

    const hashedRefreshToken = hashRefreshToken(refreshToken);

    if (!hashedRefreshToken) {
      return res.status(500).json({ error: "Refresh token hashing failed" });
    }

    await revokeRefreshToken(savedAccount.id, Type.ACCOUNT);

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
    // Set tokens as httpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      id: savedAccount.id,
      email: savedAccount.email,
      firstName: savedAccount.firstName,
      lastName: savedAccount.lastName,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 *  Login an account with the provided email and password. If the credentials are valid, an access token and a refresh token are generated and sent as httpOnly cookies.
 * @param req  RequestAccount with body containing email and password for the account to login
 * @param res  Response with success message or error message
 * @returns  JSON with success message or error message
 */
export const loginAccount = async (req: RequestAccount, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const account = await findAccountByEmail(email);

    if (!account) {
      return res.status(401).json({ error: "Account doesn't exist" });
    }
    if (!account.password) {
      return res
        .status(401)
        .json({ error: "Account doesn't have a password set" });
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const accessToken = generateAccessToken(
      { subjectId: account.id, type: Type.ACCOUNT },
      process.env.ACCESS_TOKEN_SECRET!,
      "20m",
    );

    const refreshToken = generateRefreshToken(
      { subjectId: account.id, type: Type.ACCOUNT },
      process.env.REFRESH_TOKEN_SECRET!,
      "3d",
    );

    if (!accessToken || !refreshToken) {
      return res.status(500).json({ error: "Token generation failed" });
    }

    const hashedRefreshToken = hashRefreshToken(refreshToken);

    if (!hashedRefreshToken) {
      return res.status(500).json({ error: "Refresh token hashing failed" });
    }

    await revokeRefreshToken(account.id, Type.ACCOUNT);

    const refreshTokenEntry = createRefreshToken({
      id: hashedRefreshToken,
      subjectId: account.id,
      type: Type.ACCOUNT,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    });

    const savedRefreshToken = await saveRefreshToken(refreshTokenEntry);
    if (!savedRefreshToken) {
      return res.status(500).json({ error: "Saving refresh token failed" });
    }

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      id: account.id,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 *
 * Logout an authenticated account by revoking the refresh token and clearing the access token and refresh token cookies.
 * @param req  RequestAccount with authenticated account in req.account
 * @param res   Response with success message or error message
 * @returns   JSON with success message or error message
 */
export const logoutAccount = async (req: RequestAccount, res: Response) => {
  try {
    const account = req.account;
    if (!account) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await revokeRefreshToken(account.id, Type.ACCOUNT);
    clearAuthCookies(res);
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
/** *  Handle forgot password request for an account by generating a reset token and sending a reset password email to the account's email address.
 * @param req  Request with body containing email for the account that forgot the password
 * @param res   Response with success message or error message
 * @returns   JSON with success message or error message
 */

export const forgotAccountPassword = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const account = await findAccountByEmail(email);

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const resetToken = generateResetToken(
      { subjectId: account.id, type: Type.ACCOUNT },
      process.env.RESET_TOKEN_SECRET!,
      "10m",
    );

    await sendAccountForgotPasswordEmail({
      to: email,
      firstName: account.firstName,
      token: resetToken,
    });

    return res.status(200).json({
      message: "Reset password email sent",
    });
  } catch (error) {
    console.error("Forgot account password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resetAccountPassword = async (
  req: RequestWithResetToken,
  res: Response,
) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    const resetToken = req.resetToken;
    if (!resetToken) {
      return res.status(401).json({ error: "Missing reset token payload" });
    }

    if (resetToken.type !== Type.ACCOUNT) {
      return res.status(403).json({ error: "Invalid token type" });
    }

    const account = await findAccountById(resetToken.subjectId);
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    account.password = hashedPassword;
    await saveAccount(account);

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Reset account password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
