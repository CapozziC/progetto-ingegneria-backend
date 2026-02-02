import { User } from "../db/entities/user.js";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../db/utils/auth.utils.js";
import { AppDataSource } from "../db/data-source.js";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "First name and last name are required" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = userRepository.create({
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: hashedPassword,
    });
    await userRepository.save(newUser);

    const accessToken = generateAccessToken(
      { userId: newUser.id },
      process.env.ACCESS_TOKEN_SECRET!,
      "15m",
    );

    const refreshToken = generateRefreshToken(
      { userId: newUser.id },
      process.env.REFRESH_TOKEN_SECRET!,
      "7d",
    );

    if (!accessToken || !refreshToken) {
      return res.status(500).json({ error: "Token generation failed" });
    }

    const refreshTokenRepository = AppDataSource.getRepository("RefreshToken");
    const refreshTokenEntry = refreshTokenRepository.create({
      token: refreshToken,
      user: newUser,
    });
    await refreshTokenRepository.save(refreshTokenEntry);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
